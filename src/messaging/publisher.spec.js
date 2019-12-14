const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const RedisServer = require('redis-server');

const Publisher = require('./publisher');
const Config = require('../config/config');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Publisher', () => {

  let redisServer;
  let publisher;

  before(async () => {
    redisServer = new RedisServer({
      port: 6400,
      bin: '/usr/local/bin/redis-server'
    });
    await redisServer.open();
  });

  after(async () => {
    await redisServer.close();
    await publisher.disconnect();
  });

  beforeEach(() => {
    const config = new Config('test');
    config.set('redis.url', 'redis://localhost:6400');
    publisher = new Publisher(config);
  });

  it('should not fail to disconnect if not connected', async () => {
    expect(publisher.redisClient).to.not.exist;
    await publisher.disconnect();
    expect(publisher.redisClient).to.not.exist;
  });

  it('should fail to get connection', async () => {
    const config = new Config('test');
    config.set('redis.url', 'redis://localhost:6500');
    publisher = new Publisher(config);
    await expect(publisher.getConnection()).to.be.rejected;
  });

  it('should get connection and close', async () => {
    let res = await publisher.getConnection();
    expect(res).to.exist;
    expect(publisher.redisClient).to.exist;
    res = await publisher.getConnection();
    expect(res).to.exist;
    await publisher.disconnect();
    res = await publisher.getConnection();
    expect(res).to.exist;
    await publisher.disconnect();
  });

  it('should publish message', async () => {
    const res = await publisher.publish({
      type: 'profile_updated',
      message: 'Profile for test udpated',
      data: {
        profileId: 'id',
        username: 'id',
        timestamp: new Date()
      }
    });
    expect(res).to.exist;
  });

});
