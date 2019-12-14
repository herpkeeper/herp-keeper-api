const asyncRedis = require("async-redis");

const Logger = require('../logger/logger');

class Publisher {

  constructor(config) {
    this.log = Logger.getLogger('messaging:publisher');
    this.url = config.get('redis.url');
  }

  async getConnection() {
    this.log.debug(`Attempt to get redis connection to ${this.url}`);

    if (this.redisClient) {
      if (!this.redisClient.connected || !this.redisClient.ready) {
        this.log.warn('Redis client is disconnected, create a new one');
        this.redisClient = null;
      }
    }

    return new Promise((resolve, reject) => {
      if (this.redisClient) {
        this.log.debug('Already connected to redis, return existing');
        resolve(this.redisClient);
      } else {
        let c = asyncRedis.createClient(this.url,
                                        {
                                          retry_strategy: (options) => {
                                            if (options.error && options.error.code === 'ECONNREFUSED') {
                                              reject(options.error);
                                            }
                                          }
                                        });
        c.on('ready', () => {
          this.log.debug('Redis connection is ready');
          this.redisClient = c;
          resolve(this.redisClient);
        });
      }
    });
  }

  async disconnect() {
    this.log.debug('Attempt to disconnect publisher from redis');
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  async publish(data) {
    this.log.debug('Attempt to publish data to redis: %o', data);
    const message = JSON.stringify(data);
    await this.getConnection();
    return(await this.redisClient.publish('messages', message));
  }

}

module.exports = Publisher;
