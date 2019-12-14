const mongoose = require('mongoose');

const ObjectId = mongoose.SchemaTypes.ObjectId;

function pointSchemaCoordinatesValidate(val) {
  return val.length == 2;
}

const pointSchema = mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: [
      pointSchemaCoordinatesValidate,
      'Coordinates must be longitude, then latitude'
    ]
  }
});

const locationSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  geoLocation: {
    type: pointSchema,
    required: true
  },
  imageId: {
    type: ObjectId
  },
  fullAddress: {
    type: String
  }
}, { timestamps: true });

module.exports = locationSchema;
