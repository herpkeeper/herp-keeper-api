const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkImage = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  title: {
    isLength: {
      options: { min: 1 }
    }
  },
  caption: {
    optional: { options: { nullable: true } }
  },
  // Filename is required if _id is not set
  fileName: {
    custom: {
      options: (value, { req, location, path }) => {
        if (!req.body._id && !value) return false;
        return true;
      }
    }
  },
  // Content type is required if _id is not set
  contentType: {
    custom: {
      options: (value, { req, location, path }) => {
        if (!req.body._id && !value) return false;
        return true;
      }
    }
  },
  // Data is required if _id is not et
  data: {
    custom: {
      options: (value, { req, location, path }) => {
        if (!req.body._id && !value) return false;
        return true;
      }
    }
  }
});

class ImageApi {

  constructor(router, tokenFactory) {
    this.router = router;
    this.log = Logger.getLogger('image:image-api');
    es6BindAll(this, [
      'save',
      'get',
      'delete'
    ]);

    this.router.post('/image', checkJwt({ tokenFactory, roles: ['member'] }), checkImage, this.save);
    this.router.get('/image/:id', checkJwt({ tokenFactory, roles: ['member'] }), this.get);
    this.router.delete('/image/:id', checkJwt({ tokenFactory, roles: ['member'] }), this.delete);
  }

  async save(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to save image due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const username = req.user;
      const profileCollection = req.app.get('profileCollection');
      this.log.debug(`Attempting to save image ${req.body.title} for user ${username}`);
      // First get profile
      const profile = await profileCollection.findByUsername(username);
      if (profile) {
        const imageCollection = req.app.get('imageCollection');
        if (req.body._id) {
          try {
            const updated = await imageCollection.update(profile._id, req.body);
            res.send(updated);
          } catch (err) {
            this.log.warn(`Failed to update image ${req.body._id} for profile ${profile._id}: ${err}`);
            res.status(404).json({ error: { message: 'Failed to update image' } });
          }
        } else {
          const imageStore = req.app.get('imageStore');
          // Now create a new image in the database
          const newImage = await imageCollection.create(profile._id, req.body);
          // Since this is a new image we need to save image first
          const data = Buffer.from(req.body.data, 'base64');
          const imageData = await imageStore.save(profile._id, newImage._id, data);
          res.send(newImage);
        }
      } else {
        this.log.warn(`Failed to save image, profile ${username} not found`);
        res.status(404).json({ error: { message: 'Failed to save image' } });
      }
    }
  }

  async get(req, res) {
    const id = req.params.id;
    const username = req.user;
    this.log.debug(`Attempting to get image ${id} for user ${username}`);
    const profileCollection = req.app.get('profileCollection');
    const profile = await profileCollection.findByUsername(username);
    if (profile) {
      const imageCollection = req.app.get('imageCollection');
      try {
        const imageStore = req.app.get('imageStore');
        const image = await imageCollection.get(profile._id, id);
        const imageData = await imageStore.get(profile._id, id);
        // Make a copy of doc
        const data = { ...image._doc };
        data.data = imageData.data;
        // Override content type with what came back from S3
        data.contentType = imageData.contentType;
        res.send(data);
      } catch (err) {
        this.log.warn(`Failed to get image for ${id} for profile ${profile._id}`);
        res.status(404).json({ error: { message: 'Failed to get image' } });
      }
    } else {
      this.log.warn(`Failed to get image, profile ${username} not found`);
      res.status(404).json({ error: { message: 'Failed to get image' } });
    }
  }

  async delete(req, res) {
    const id = req.params.id;
    const username = req.user;
    this.log.debug(`Attempting to delete image ${id} for user ${username}`);
    const profileCollection = req.app.get('profileCollection');
    const profile = await profileCollection.findByUsername(username);
    if (profile) {
      const imageCollection = req.app.get('imageCollection');
      try {
        const deleted = await imageCollection.remove(profile._id, id);
        const imageStore = req.app.get('imageStore');
        await imageStore.remove(profile._id, id);
        res.send(deleted);
      } catch (err) {
        this.log.warn(`Failed to delete image for ${id} for profile ${profile._id}`);
        res.status(404).json({ error: { message: 'Failed to delete image' } });
      }
    } else {
      this.log.warn(`Failed to delete image, profile ${username} not found`);
      res.status(404).json({ error: { message: 'Failed to delete image' } });
    }
  }

}

module.exports = ImageApi;
