const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Logger = require('../logger/logger');
const locationSchema = require('./location-schema');

class LocationCollection {

  constructor(database, profileCollection) {
    this.log = Logger.getLogger('location:location-collection');
    this.database = database;
    this.profileCollection = profileCollection;
    this.schema = locationSchema;
    this.model = mongoose.model('Location', this.schema);
  }

  async create(profileId, location) {
    this.log.debug(`Attempt to create new location in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to create location, profile ${profileId} not found`);
      throw new Error(`Failed to create location, profile ${profileId} not found`);
    }
    const newLocation = parent.locations.create(location);
    parent.locations.push(newLocation);
    const res = await parent.save();
    return newLocation;
  }

  async update(profileId, location) {
    this.log.debug(`Attempt to update location ${location._id} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to update location, profile ${profileId} not found`);
      throw new Error(`Failed to update location, profile ${profileId} not found`);
    }
    const sub = parent.locations.id(new ObjectID(location._id));
    if (!sub) {
      this.log.warn(`Failed to update location, location ${location._id} not found`);
      throw new Error(`Failed to update location, location ${location._id} not found`);
    }
    const updatedLocation = sub.set(location);
    const res = await parent.save();
    return updatedLocation;
  }

  async remove(profileId, locationId) {
    this.log.debug(`Attempt to remove location ${locationId} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to remove location, profile ${profileId} not found`);
      throw new Error(`Failed to remove location, profile ${profileId} not found`);
    }
    const sub = parent.locations.id(new ObjectID(locationId));
    if (!sub) {
      this.log.warn(`Failed to remove location, location ${locationId} not found`);
      throw new Error(`Failed to remove location, location ${locationId} not found`);
    }
    const removed = await sub.remove();
    const res = await parent.save();
    return removed;
  }
}

module.exports = LocationCollection;
