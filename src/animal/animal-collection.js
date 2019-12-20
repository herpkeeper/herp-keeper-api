const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const Logger = require('../logger/logger');
const animalSchema = require('./animal-schema');

class AnimalCollection {

  constructor(database, profileCollection) {
    this.log = Logger.getLogger('animal:animal-collection');
    this.database = database;
    this.profileCollection = profileCollection;
    this.schema = animalSchema;
    this.model = mongoose.model('Animal', this.schema);
  }

  async create(profileId, animal) {
    this.log.debug(`Attempt to create new animal in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to create animal, profile ${profileId} not found`);
      throw new Error(`Failed to create animal, profile ${profileId} not found`);
    }
    // Ensure location exists
    const location = parent.locations.id(new ObjectID(animal.locationId));
    if (!location) {
      this.log.warn(`Failed to create animal, unable to find location ${animal.locationId}`);
      throw new Error(`Failed to create animal, location ${animal.locationId} not found`);
    }
    // Ensure species exists
    const species = parent.species.id(new ObjectID(animal.speciesId));
    if (!species) {
      this.log.warn(`Failed to create animal, unable to find species ${animal.speciesId}`);
      throw new Error(`Failed to create animal, species ${animal.speciesId} not found`);
    }
    const newAnimal = parent.animals.create(animal);
    parent.animals.push(newAnimal);
    const res = await parent.save();
    return newAnimal;
  }

  async update(profileId, animal) {
    this.log.debug(`Attempt to update animal ${animal._id} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to update animal, profile ${profileId} not found`);
      throw new Error(`Failed to update animal, profile ${profileId} not found`);
    }
    const sub = parent.animals.id(new ObjectID(animal._id));
    if (!sub) {
      this.log.warn(`Failed to update animal, animal ${animal._id} not found`);
      throw new Error(`Failed to update animal, animal ${animal._id} not found`);
    }
    const location = parent.locations.id(new ObjectID(animal.locationId));
    if (!location) {
      this.log.warn(`Failed to update animal, unable to find location ${animal.locationId}`);
      throw new Error(`Failed to update animal, location ${animal.locationId} not found`);
    }
    const species = parent.species.id(new ObjectID(animal.speciesId));
    if (!species) {
      this.log.warn(`Failed to update animal, unable to find species ${animal.speciesId}`);
      throw new Error(`Failed to update animal, species ${animal.speciesId} not found`);
    }
    const updatedAnimal = sub.set(animal);
    const res = await parent.save();
    return updatedAnimal;
  }

  async updateMulti(profileId, animals) {
    this.log.debug(`Attempt to update ${animals.length} animals in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to update animals, profile ${profileId} not found`);
      throw new Error(`Failed to update animals, profile ${profileId} not found`);
    }
    animals.forEach(animal => {
      const sub = parent.animals.id(new ObjectID(animal._id));
      if (!sub) {
        this.log.warn(`Failed to update animals, animal ${animal._id} not found`);
        throw new Error(`Failed to update animals, animal ${animal._id} not found`);
      }
      const location = parent.locations.id(new ObjectID(animal.locationId));
      if (!location) {
        this.log.warn(`Failed to update animals, unable to find location ${animal.locationId}`);
        throw new Error(`Failed to update animals, location ${animal.locationId} not found`);
      }
      const species = parent.species.id(new ObjectID(animal.speciesId));
      if (!species) {
        this.log.warn(`Failed to update animals, unable to find species ${animal.speciesId}`);
        throw new Error(`Failed to update animals, species ${animal.speciesId} not found`);
      }
      const updatedAnimal = sub.set(animal);
    });
    const res = await parent.save();
    return res.animals;
  }

  async remove(profileId, animalId) {
    this.log.debug(`Attempt to remove animalId ${animalId} in profile ${profileId}`);
    await this.database.getConnection();
    const parent = await this.profileCollection.findById(new ObjectID(profileId));
    if (!parent) {
      this.log.warn(`Failed to remove animal, profile ${profileId} not found`);
      throw new Error(`Failed to remove animal, profile ${profileId} not found`);
    }
    const sub = parent.animals.id(new ObjectID(animalId));
    if (!sub) {
      this.log.warn(`Failed to remove animal, animal ${animalId} not found`);
      throw new Error(`Failed to remove animal, animal ${animalId} not found`);
    }
    const removed = await sub.remove();
    const res = await parent.save();
    return removed;
  }

}

module.exports = AnimalCollection;
