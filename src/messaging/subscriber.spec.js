const chai = require('chai');
const RedisServer = require('redis-server');
const express = require('express');
const WebSocket = require('ws');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Subscriber = require('./subscriber');
const Publisher = require('./publisher');
const Config = require('../config/config');
const TokenFactory = require('../token/token-factory');
const WsServer = require('../ws/ws-server');
const Database = require('../db/database');
const ProfileCollection = require('../profile/profile-collection');
const profileSchema = require('../profile/profile-schema');

const expect = chai.expect;

describe('Subscriber', () => {

  const wsUrl = 'ws://localhost:8888/ws';
  let config;
  let redisServer;
  let mongoServer;
  let subscriber;
  let publisher;
  let app;
  let server;
  let tokenFactory;
  let wsServer;
  let userToken;
  let database;
  let profileCollection;
  let profile;

  before(async () => {
    app = express();
    server = await app.listen(8888);
    redisServer = new RedisServer({
      port: 6400,
      bin: '/usr/local/bin/redis-server'
    });
    await redisServer.open();
    mongoServer = new MongoMemoryServer();
    const uri = await mongoServer.getConnectionString();
    config = new Config('test');
    await config.load();
    config.set('database.url', uri);
    config.set('redis.url', 'redis://localhost:6400');
    tokenFactory = new TokenFactory(config);
    publisher = new Publisher(config);
    profileSchema.publisher = publisher;
    wsServer = new WsServer(server, tokenFactory);
    await wsServer.start();
    userToken = await tokenFactory.createAccessToken({
      username: 'user1',
      role: 'member'
    });
    database = new Database(config);
    profileCollection = new ProfileCollection(database);
    const _profile = {
      username: 'user1',
      email: 'test1@test.com',
      name: 'Name',
      password: 'password',
      role: 'member',
      active: true
    };
    profile = await profileCollection.create(_profile);
  });

  after(async () => {
    await publisher.disconnect();
    await subscriber.stop();
    await redisServer.close();
    await wsServer.stop();
    await server.close();
    await database.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    subscriber = new Subscriber(config, wsServer);
  });

  afterEach(async () => {
    await subscriber.stop();
  });

  it('should not fail to stop if not started', async () => {
    await subscriber.stop();
  });

  it('should subscribe and receive', async () => {
    await subscriber.start();
    await subscriber.start();
    await publisher.publish({ test: 'test' });
  });

  it('should handle unknown message', async () => {
    subscriber.start();
    subscriber.handleMessage({}, {});
  });

  it('should publish profile update message and receive via websocket', (done) => {
    subscriber.start();
    const socket = new WebSocket(wsUrl);
    socket.on('open', () => {
      const msg = {
        type: 'authenticate',
        payload: userToken
      };
      socket.send(JSON.stringify(msg));
      socket.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'authenticate') {
          profile.name = 'Updated Name';
          profileCollection.update(profile);
        } else if (msg.type === 'profile_updated') {
          expect(msg.payload.username).to.equal('user1');
          expect(msg.payload.profileId).to.exist;
          expect(msg.payload.timestamp).to.exist;
          socket.close();
        }
      });
      socket.on('close', () => {
        done();
      });
    });
  });

});
