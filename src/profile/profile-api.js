const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkProfile = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  name: {
    isLength: {
      options: { min: 1 }
    },
    optional: { options: { nullable: true } }
  }
});

class ProfileApi {

  constructor(router, tokenFactory) {
    this.log = Logger.getLogger('profile:profile-api');
    this.router = router;
    this.tokenFactory = tokenFactory;

    es6BindAll(this, [
      'count',
      'find',
      'get',
      'save'
    ]);

    this.router.get('/profile', checkJwt({ tokenFactory, roles: ['admin'] }), this.find);
    this.router.get('/profile/count', checkJwt({ tokenFactory, roles: ['admin'] }), this.count);
    this.router.get('/profile/:id', checkJwt({ tokenFactory, roles: ['admin', 'member'] }), this.get);
    this.router.post('/profile', checkProfile, checkJwt({ tokenFactory, roles: ['member'] }), this.save);
  }

  async count(req, res) {
    const query = req.query;
    this.log.debug('Attempting to get profile count with query %o', query);
    const profileCollection = req.app.get('profileCollection');
    const c = await profileCollection.count(query);
    res.send({ count: c });
  }

  async find(req, res) {
    const query = req.query;
    const options = {
      skip: parseInt(req.query.skip) || 0,
      limit: parseInt(req.query.limit) || 0
    };
    // Remove skip and limit from query
    delete query.skip;
    delete query.limit;
    this.log.debug('Attempting to find profiles. Query: %o, Options: %o', query, options);
    const profileCollection = req.app.get('profileCollection');
    const profiles = await profileCollection.find(query, options);
    profiles.forEach(p => p.password = null);
    res.send(profiles);
  }

  async get(req, res) {
    const id = req.params.id;
    this.log.debug(`Attempting to get profile ${id}`);
    const profileCollection = req.app.get('profileCollection');
    if (req.role === 'admin') {
      res.send(await profileCollection.findById(id));
    } else {
      const p = await profileCollection.findByUsernameAndId(req.user, id);
      if (p) {
        p.password = undefined;
        res.send(p);
      } else {
        res.status(403).json({ error: { message: 'Access to this profile is forbidden' } });
      }
    }
  }

  async save(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save profile due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      const profileCollection = req.app.get('profileCollection');
      this.log.debug(`Attempting to update profile ${req.body._id} for user ${username}`);
      // Ensure that this is our profile
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        if (profile._id == req.body._id) {
          const updated = await profileCollection.update(req.body);
          updated.password = undefined;
          res.send(updated);
        } else {
          res.status(403).json({ error: { message: 'Access to this profile is forbidden' } });
        }
      } else {
        this.log.warn(`Failed to update profile, profile for ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to update profile' } });
      }
    }
  }

}

module.exports = ProfileApi;
