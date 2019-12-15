const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const Logger = require('../logger/logger');

const checkActivation = checkSchema({
  username: {
    in: ['query' ],
    isLength: {
      options: { min: 1 }
    }
  },
  key: {
    in: ['query'],
    isLength: {
      options: { min: 1 }
    }
  }
});

class ActivateAccountApi {

  constructor(router) {
    this.log = Logger.getLogger('activate-account:activate-account-api');
    this.router = router;
    es6BindAll(this, [
      'activate'
    ]);

    this.router.get('/activate-account', checkActivation, this.activate);
  }

  async activate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Validation failed for account activation: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const profileCollection = req.app.get('profileCollection');
      this.log.debug(`Attempting to activate account ${req.query.username} with key ${req.query.key}`);
      const profile = await profileCollection.findByUsername(req.query.username);
      if (profile) {
        try {
          const r = await profileCollection.activate(profile._id, req.query.key);
          res.send({
            username: r.username,
            email: r.email,
            name: r.name
          });
        } catch (err) {
          this.log.warn(`Failed to activate account for ${req.query.username}, ${err}`);
          res.status(404).send({ error: { message: 'Failed to activate account' } });
        }
      } else {
        this.log.warn(`Failed to activate account for ${req.query.username}, profile not found`);
        res.status(404).send({ error: { message: 'Failed to activate account' } });
      }
    }
  }

}

module.exports = ActivateAccountApi;
