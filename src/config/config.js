const fs = require('fs');
const lodash = require('lodash');

const fsPromises = fs.promises;

class Config {

  constructor(env) {
    this.config = { };
    this.env = env;
    this.configFile = `./config/config.${env}.json`;
  }

  async load() {
    // eslint-disable-next-line no-console
    console.log(`Attempt to load configuration from ${this.configFile}`);
    const data = await fsPromises.readFile(this.configFile);
    this.config = JSON.parse(data);
    return this.config;
  }

  get(key) {
    return lodash.get(this.config, key);
  }

  set(key, value) {
    lodash.set(this.config, key, value);
  }

}

module.exports = Config;
