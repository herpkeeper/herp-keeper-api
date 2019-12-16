const mongoose = require('mongoose');

const refreshTokenSchema = require('./refresh-token-schema');
const Logger = require('../logger/logger');

class RefreshTokenCollection {

  constructor(database) {
    this.log = Logger.getLogger('token:refresh-token-collection');
    this.database = database;
    this.schema = refreshTokenSchema;
    this.model = mongoose.model('RefreshToken', this.schema);
  }

  async createIndexes() {
    this.log.debug('Attempt to create refresh token indexes');
    await this.database.getConnection();
    await this.model.createIndexes();
  }

  async create(refreshToken) {
    this.log.debug(`Attempt to create refresh token for user ${refreshToken.username}`);
    await this.database.getConnection();
    const res = await this.model.create(refreshToken);
    return res;
  }

  async findByUsername(username) {
    this.log.debug(`Attempt to find refresh tokens by username ${username}`);
    await this.database.getConnection();
    const res = await this.model.find({ username: username }).exec();
    return res;
  }

  async findByUsernameAndToken(username, token) {
    this.log.debug(`Attempt to find refresh tokens by username ${username} and token`);
    await this.database.getConnection();
    const res = await this.model.findOne({ username: username, token: token }).exec();
    return res;
  }

  async removeByUsername(username) {
    this.log.debug(`Attempt to remove refresh tokens by username ${username}`);
    await this.database.getConnection();
    const res = await this.model.deleteMany({ username: username }).exec();
    return res.deletedCount;
  }

  async removeByUsernameAndToken(username, token) {
    this.log.debug(`Attempt to remove refresh tokens by username ${username} and token`);
    await this.database.getConnection();
    const res = await this.model.deleteOne({ username: username, token: token }).exec();
    return res.deletedCount;
  }

}

module.exports = RefreshTokenCollection;
