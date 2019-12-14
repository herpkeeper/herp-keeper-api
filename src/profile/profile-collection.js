const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Logger = require('../logger/logger');
const profileSchema = require('./profile-schema');

class ProfileCollection {

  constructor(database) {
    this.log = Logger.getLogger('profile:profile-collection');
    this.database = database;
    this.schema = profileSchema;
    this.model = mongoose.model('Profile', this.schema);
  }

  async createIndexes() {
    this.log.debug('Attempt to create profile indexes');
    await this.database.getConnection();
    await this.model.createIndexes();
  }

  async count(query) {
    query = query || { };
    this.log.debug('Attempt to get profile count with query: %o', query);
    await this.database.getConnection();
    const res = await this.model.countDocuments(query);
    return res;
  }

  async find(query, options) {
    query = query || { };
    options = options || { };
    this.log.debug('Attempt to find profiles with query %o and options %o', query, options);
    await this.database.getConnection();
    const res = await this.model.find(query, null, options).exec();
    return res;
  }

  async get(id) {
    this.log.debug(`Attempt to get profile ${id}`);
    await this.database.getConnection();
    const res = await this.model.findOne({ _id: new ObjectID(id) }).exec();
    return res;
  }

  async create(profile) {
    this.log.debug(`Attempt to create profile ${profile.username}`);
    await this.database.getConnection();
    const res = await this.model.create(profile);
    return res;
  }

  async update(profile) {
    this.log.debug(`Attempt to update profile ${profile._id}`);

    const doc = await this.model.findById(new ObjectID(profile._id)).exec();
    if (!doc) {
      this.log.warn(`Failed to update profile ${profile._id}, profile not found`);
      throw new Error(`Could not find profile ${profile._id}`);
    }

    doc.name = profile.name;
    doc.email = profile.email;
    doc.password = profile.password;
    doc.foodTypes = profile.foodTypes;

    const updated = await doc.save();
    return updated;
  }

  async activate(id, key) {
    this.log.debug(`Attempt to activate profile ${id} with key of ${key}`);
    const profile = await this.model.findOne({ _id: new ObjectID(id), activationKey: key }).exec();
    if (!profile) {
      this.log.warn(`Failed to activate profile ${id} with key of ${key}`);
      throw new Error(`Failed to activate profile ${id}`);
    }
    profile.active = true;
    profile.activationKey = undefined;
    const updated = await profile.save();
    return updated;
  }

  async remove(id) {
    this.log.debug(`Attempt to remove profile ${id}`);
    const res = await this.model.findByIdAndRemove(new ObjectID(id)).exec();
    return res;
  }

  async findByUsername(username) {
    this.log.debug(`Attempt to find profile by username ${username}`);
    const res = await this.model.findOne({ username: username }).exec();
    return res;
  }

  async findById(id) {
    this.log.debug(`Attempt to find profile by id ${id}`);
    const res = await this.model.findById(new ObjectID(id)).exec();
    return res;
  }

  async findByUsernameAndId(username, id) {
    this.log.debug(`Attempt to find profile by id ${id} and username ${username}`);
    const res = await this.model.findOne({ username: username, _id: new ObjectID(id) }).exec();
    return res;
  }

}

module.exports = ProfileCollection;
