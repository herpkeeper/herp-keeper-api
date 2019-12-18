const asyncRedis = require("async-redis");

const Logger = require('../logger/logger');

class Subscriber {

  constructor(config, wsServer) {
    this.log = Logger.getLogger('messaging:subscriber');
    this.url = config.get('redis.url');
    this.wsServer = wsServer;
  }

  async handleMessage(message, wsServer) {
    this.log.debug(`Handling message of type ${message.type}`);

    if (message.type === 'profile_updated') {
      this.wsServer.sendProfileUpdated(message);
    }
  }

  async start() {
    this.log.debug(`Attempting to start redis subscriber to url ${this.url}`);

    if (!this.redisClient) {
      this.log.debug('No existing redis connection, create one');
      this.redisClient = asyncRedis.createClient(this.url);
      this.redisClient.on('message', async (channel, message) => {
        this.log.debug(`Got message ${message} on channel ${channel}`);
        await this.handleMessage(JSON.parse(message));
      });
      this.redisClient.subscribe('messages');
    }
  }

  async stop() {
    this.log.debug('Attempting to stop redis subscriber');

    if (this.redisClient) {
      this.redisClient.quit();
    }
  }

}

module.exports = Subscriber;
