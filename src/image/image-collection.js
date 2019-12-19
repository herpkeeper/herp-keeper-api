const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Logger = require('../logger/logger');
const imageSchema = require('./image-schema');

class ImageCollection {

  constructor(database, profileCollection) {
    this.log = Logger.getLogger('image:image-collection');
    this.database = database;
    this.profileCollection = profileCollection;
    this.schema = imageSchema;
    this.model = mongoose.model('Image', this.schema);
  }

  async get(profileId, imageId) {
    this.log.debug(`Attempt to get image ${imageId} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to get image, profile ${profileId} not found`);
      throw new Error(`Failed to get image, profile ${profileId} not found`);
    }
    const sub = parent.images.id(new ObjectID(imageId));
    if (!sub) {
      this.log.warn(`Failed to get image, image ${imageId} not found`);
      throw new Error(`Failed to get image, image ${imageId} not found`);
    }
    return sub;
  }

  async create(profileId, image) {
    this.log.debug(`Attempt to create new image in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to create image, profile ${profileId} not found`);
      throw new Error(`Failed to create image, profile ${profileId} not found`);
    }
    const newImage = parent.images.create(image);
    parent.images.push(newImage);
    const res = await parent.save();
    return newImage;
  }

  async update(profileId, image) {
    this.log.debug(`Attempt to update image ${image._id} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to update image, profile ${profileId} not found`);
      throw new Error(`Failed to update image, profile ${profileId} not found`);
    }
    const sub = parent.images.id(new ObjectID(image._id));
    if (!sub) {
      this.log.warn(`Failed to update image, image ${image._id} not found`);
      throw new Error(`Failed to update image, image ${image._id} not found`);
    }
    const updatedImage = sub.set(image);
    const res = await parent.save();
    return updatedImage;
  }

  async remove(profileId, imageId) {
    this.log.debug(`Attempt to remove image ${imageId} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to remove image, profile ${profileId} not found`);
      throw new Error(`Failed to remove image, profile ${profileId} not found`);
    }
    const sub = parent.images.id(new ObjectID(imageId));
    if (!sub) {
      this.log.warn(`Failed to remove image, image ${imageId} not found`);
      throw new Error(`Failed to remove image, image ${imageId} not found`);
    }
    const removed = await sub.remove();
    const res = await parent.save();
    return removed;
  }

}

module.exports = ImageCollection;
