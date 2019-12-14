const mongoose = require('mongoose');

const imageSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  caption: String,
  contentType: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = imageSchema;
