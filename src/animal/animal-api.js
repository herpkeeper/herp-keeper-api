const { body, checkSchema, oneOf, validationResult } = require('express-validator');
const lodash = require('lodash');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkAnimal = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  name: {
    isLength: {
      options: { min: 1 }
    }
  },
  locationId: {
    isMongoId: true
  },
  speciesId: {
    isMongoId: true
  },
  birthDate: {
    optional: { options: { nullable: true } },
    isISO8601: true
  },
  aquisitionDate: {
    optional: { options: { nullable: true } },
    isISO8601: true
  },
  preferredFood: {
    isLength: {
      options: { min: 1 }
    },
    optional: { options: { nullable: true } }
  },
  'images.*._id': {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  'images.*.imageId': {
    isMongoId: true
  },
  'images.*.default': {
    isBoolean: true,
    optional: { options: { nullable: true } }
  },
  'feedings.*._id': {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  'feedings.*.feedingDate': {
    isISO8601: true
  },
  'feedings.*.quantity': {
    isNumeric: true
  },
  'feedings.*.type': {
    isLength: {
      options: { min: 1 }
    }
  }
});

const checkAnimals = checkSchema({
  '*._id': {
    optional: { options: { nullable: true } },
    isMongoId: true,
      in: ['body']
  },
  '*.name': {
    isLength: {
      options: { min: 1 }
    },
      in: ['body']
  },
  '*.locationId': {
    isMongoId: true,
      in: ['body']
  },
  '*.speciesId': {
    isMongoId: true,
      in: ['body']
  },
  '*.birthDate': {
    optional: { options: { nullable: true } },
    isISO8601: true,
      in: ['body']
  },
  '*.aquisitionDate': {
    optional: { options: { nullable: true } },
    isISO8601: true,
      in: ['body']
  },
  '*.preferredFood': {
    isLength: {
      options: { min: 1 }
    },
    optional: { options: { nullable: true } },
      in: ['body']
  },
  '*.images.*._id': {
    optional: { options: { nullable: true } },
    isMongoId: true,
      in: ['body']
  },
  '*.images.*.imageId': {
    isMongoId: true,
      in: ['body']
  },
  '*.images.*.default': {
    isBoolean: true,
    optional: { options: { nullable: true } },
      in: ['body']
  },
  '*.feedings.*._id': {
    optional: { options: { nullable: true } },
    isMongoId: true,
      in: ['body']
  },
  '*.feedings.*.feedingDate': {
    isISO8601: true,
      in: ['body']
  },
  '*.feedings.*.quantity': {
    isNumeric: true,
      in: ['body']
  },
  '*.feedings.*.type': {
    isLength: {
      options: { min: 1 }
    },
      in: ['body']
  }
});

class AnimalApi {

  constructor(router, tokenFactory) {
    this.log = Logger.getLogger('animal:animal-api');
    this.router = router;
    this.tokenFactory = tokenFactory;
    es6BindAll(this, [
      'save',
      'saveMulti',
      'delete'
    ]);

    this.router.post('/animals', checkJwt({ tokenFactory, roles: ['member'] }), body().isArray({ min: 1 }), checkAnimals, this.saveMulti);
    this.router.post('/animal', checkJwt({ tokenFactory, roles: ['member'] }), checkAnimal, this.save);
    this.router.delete('/animal/:id', checkJwt({ tokenFactory, roles: ['member'] }), this.delete);
  }

  async save(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save animal due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      this.log.debug(`Attempt to save animal ${req.body.name} for user ${username}`);
      // First get our profile
      const profileCollection = req.app.get('profileCollection');
      const animalCollection = req.app.get('animalCollection');
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        if (req.body._id) {
          try {
            const updated = await animalCollection.update(profile._id, req.body);
            res.send(updated);
          } catch (err) {
            this.log.warn(`Failed to update animal ${req.body._id} for profile ${profile._id}: ${err}`);
            res.status(404).json({ error: { message: 'Failed to update animal' } });
          }
        } else {
          res.send(await animalCollection.create(profile._id, req.body));
        }
      } else {
        this.log.warn(`Failed to save animal, profile ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to save animal' } });
      }
    }
  }

  async saveMulti(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save animals due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      this.log.debug(`Attempt to save ${req.body.length} animals for user ${username}`);
      // First get our profile
      const profileCollection = req.app.get('profileCollection');
      const animalCollection = req.app.get('animalCollection');
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        try {
          const updated = await animalCollection.updateMulti(profile._id, req.body);
          res.send(updated);
        } catch (err) {
          this.log.warn(`Failed to update animals for profile ${profile._id}: ${err}`);
          res.status(404).json({ error: { message: 'Failed to update animals' } });
        }
      } else {
        this.log.warn(`Failed to save animals, profile ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to save animals' } });
      }
    }
  }

  async delete(req, res) {
    const id = req.params.id;
    const username = req.user;
    this.log.debug(`Attempt to delete animal ${id} for user ${username}`);
    const profileCollection = req.app.get('profileCollection');
    const animalCollection = req.app.get('animalCollection');
    const profile = await profileCollection.findByUsername(username);
    if (profile) {
      try {
        const deleted = await animalCollection.remove(profile._id, id);
        res.send(deleted);
      } catch (err) {
        this.log.warn(`Failed to delete animal ${id} for profile ${profile._id}: ${err}`);
        res.status(404).json({ error: { message: 'Failed to delete animal' } });
      }
    } else {
      this.log.warn(`Failed to delete animal, profile ${username} not found`);
      res.status(404).json({ error: { message: 'Failed to delete animal' } });
    }
  }

}

module.exports = AnimalApi;
