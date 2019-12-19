const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Logger = require('../logger/logger');
const speciesSchema = require('./species-schema');

class SpeciesCollection {

  constructor(database, profileCollection) {
    this.log = Logger.getLogger('species:species-collection');
    this.database = database;
    this.profileCollection = profileCollection;
    this.schema = speciesSchema;
    this.model = mongoose.model('Species', this.schema);
  }

  async create(profileId, species) {
    this.log.debug(`Attempt to create new species in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to create species, profile ${profileId} not found`);
      throw new Error(`Failed to create species, profile ${profileId} not found`);
    }
    const newSpecies = parent.species.create(species);
    parent.species.push(newSpecies);
    const res = await parent.save();
    return newSpecies;
  }

}

module.exports = SpeciesCollection;
