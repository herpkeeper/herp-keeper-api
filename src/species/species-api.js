const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkSpecies = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  commonName: {
    isLength: {
      options: { min: 1 }
    }
  },
  class: {
    optional: { options: { nullable: true } }
  },
  order: {
    optional: { options: { nullable: true } }
  },
  subOrder: {
    optional: { options: { nullable: true } }
  },
  genus: {
    optional: { options: { nullable: true } }
  },
  species: {
    optional: { options: { nullable: true } }
  },
  venomous: {
    isBoolean: true,
    optional: { options: { nullable: true } }
  },
  potentiallyHarmful: {
    isBoolean: true,
    optional: { options: { nullable: true } }
  },
  imageId: {
    optional: { options: { nullable: true } },
    isMongoId: true
  }
});

class SpeciesApi {

  constructor(router, tokenFactory) {
    this.log = Logger.getLogger('species:species-api');
    this.router = router;
    this.tokenFactory = tokenFactory;
    es6BindAll(this, [
      'save'
    ]);

    this.router.post('/species', checkJwt({ tokenFactory, roles: ['member'] }), checkSpecies, this.save);
  }

  async save(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save species due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      this.log.debug(`Attempt to save species ${req.body.commonName} for user ${username}`);
      // First get our profile
      const profileCollection = req.app.get('profileCollection');
      const speciesCollection = req.app.get('speciesCollection');
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        if (req.body._id) {
          try {
            const updated = await speciesCollection.update(profile._id, req.body);
            res.send(updated);
          } catch (err) {
            this.log.warn(`Failed to update species ${req.body._id} for profile ${profile._id}: ${err}`);
            res.status(404).json({ error: { message: 'Failed to update species' } });
          }
        } else {
          res.send(await speciesCollection.create(profile._id, req.body));
        }
      } else {
        this.log.warn(`Failed to save species, profile ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to save species' } });
      }
    }
  }

}

module.exports = SpeciesApi;
