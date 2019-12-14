const mongoose = require('mongoose');

const ObjectId = mongoose.SchemaTypes.ObjectId;

const animalImageSchema = mongoose.Schema({
  imageId: {
    type: ObjectId,
    required: true
  },
  default: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const feedingSchema = mongoose.Schema({
  feedingDate: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  type: {
    type: String,
    required: true
  }
}, { timestamps: true });

const animalSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  locationId: {
    type: ObjectId,
    required: true
  },
  speciesId: {
    type: ObjectId,
    required: true
  },
  sex: {
    type: String,
    enum: ['M', 'F', 'U'],
    default: 'U'
  },
  birthDate: {
    type: Date
  },
  acquisitionDate: {
    type: Date
  },
  images: {
    type: [animalImageSchema]
  },
  preferredFood: {
    type: String
  },
  feedings: {
    type: [feedingSchema]
  }
}, { timestamps: true });

module.exports = animalSchema;
