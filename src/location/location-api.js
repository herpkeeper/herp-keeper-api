const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkLocation = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  name: {
    isLength: {
      options: { min: 1 }
    }
  },
  'geoLocation.type': {
    equals: { options: 'Point' }
  },
  'geoLocation.coordinates': {
    custom: {
      options: (value, { req, location, path }) => {
        if (Array.isArray(value)) {
          if (value.length === 2) {
            return typeof value[0] == 'number' && typeof value[1] == 'number';
          }
        }
        return false;
      }
    }
  },
  imageId: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  fullAddress: {
    optional: { options: { nullable: true } },
    isLength: {
      options: { min: 1 }
    }
  }
});

class LocationApi {

  constructor(router, tokenFactory) {
    this.log = Logger.getLogger('location:location-api');
    this.router = router;
    this.tokenFactory = tokenFactory;
    es6BindAll(this, [
      'save',
      'delete'
    ]);

    this.router.post('/location', checkJwt({ tokenFactory, roles: ['member'] }), checkLocation, this.save);
    this.router.delete('/location/:id', checkJwt({ tokenFactory, roles: ['member'] }), this.delete);
  }

  async save(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save location due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      this.log.debug(`Attempt to save location ${req.body.name} for user ${username}`);
      // First get our profile
      const profileCollection = req.app.get('profileCollection');
      const locationCollection = req.app.get('locationCollection');
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        if (req.body._id) {
          try {
            const updated = await locationCollection.update(profile._id, req.body);
            res.send(updated);
          } catch (err) {
            this.log.warn(`Failed to update location ${req.body._id} for profile ${profile._id}: ${err}`);
            res.status(404).json({ error: { message: 'Failed to update location' } });
          }
        } else {
          res.send(await locationCollection.create(profile._id, req.body));
        }
      } else {
        this.log.warn(`Failed to save location, profile ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to save location' } });
      }
    }
  }

  async delete(req, res) {
    const id = req.params.id;
    const username = req.user;
    this.log.debug(`Attempt to delete location ${id} for user ${username}`);
    const profileCollection = req.app.get('profileCollection');
    const locationCollection = req.app.get('locationCollection');
    const profile = await profileCollection.findByUsername(username);
    if (profile) {
      try {
        const deleted = await locationCollection.remove(profile._id, id);
        res.send(deleted);
      } catch (err) {
        this.log.warn(`Failed to delete location ${id} for profile ${profile._id}: ${err}`);
        res.status(404).json({ error: { message: 'Failed to delete location' } });
      }
    } else {
      this.log.warn(`Failed to delete location, profile ${username} not found`);
      res.status(404).json({ error: { message: 'Failed to delete location' } });
    }
  }

}

module.exports = LocationApi;
