const mongoose = require('mongoose');

const Logger = require('../logger/logger');

class Database {

  constructor(config) {
    this.log = Logger.getLogger('db:database');
    this.url = config.get('database.url');
  }

  async getConnection() {
    this.log.debug(`Attempting to get database connection from ${this.url}`);

    if (!this.connection) {
      this.log.debug('No existing connection found, create a new one');
      await mongoose.connect(this.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
        useFindAndModify: false,
        useCreateIndex: true
      });
      this.connection = mongoose.connection;
    }
    return this.connection;
  }

  async disconnect() {
    this.log.debug('Disconnecting from database');

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

}

module.exports = Database;
