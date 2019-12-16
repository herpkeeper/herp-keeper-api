const mongoose = require('mongoose');

const TokenFactory = require('./token-factory');

const refreshTokenSchema = mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
}, { timestamps: true });

refreshTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: TokenFactory.REFRESH_EXPIRES_SECONDS });

module.exports = refreshTokenSchema;
