const mongoose = require('mongoose');

const ObjectId = mongoose.SchemaTypes.ObjectId;

const speciesSchema = mongoose.Schema({
  commonName: {
    type: String,
    required: true
  },
  class: String,
  order: String,
  subOrder: String,
  genus: String,
  species: String,
  subSpecies: String,
  imageId: {
    type: ObjectId
  },
  venomous: {
    type: Boolean,
    default: false
  },
  potentiallyHarmful: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = speciesSchema;
