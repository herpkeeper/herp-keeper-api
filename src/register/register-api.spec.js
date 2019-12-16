const chai = require('chai');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID;

const App = require('../app/app');
const profileSchema = require('../profile/profile-schema');
const ProfileCollection = require('../profile/profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');
const Mailer = require('../mail/mailer');
const TokenFactory = require('../token/token-factory');
const RefreshTokenCollection = require('../token/refresh-token-collection');

const expect = chai.expect;

describe('RegisterApi', () => {

  let app;
  let database;
  let config;
  let mongoServer;
  let redisServer;
  let profileCollection;
  let refreshTokenCollection;
  let publisher;
  let mailer;
  let tokenFactory;

  before(async function() {
    this.timeout(10000);
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
    publisher = new Publisher(config);
    profileSchema.publisher = publisher;
    database = new Database(config);
    await database.getConnection();
    profileCollection = new ProfileCollection(database);
    refreshTokenCollection = new RefreshTokenCollection(database);
    await profileCollection.createIndexes();
    await refreshTokenCollection.createIndexes();
    mailer = new Mailer(config);
    tokenFactory = new TokenFactory(config);
    app = new App(config, tokenFactory, mailer, {
      profileCollection,
      refreshTokenCollection
    }).app;
  });

  after(async function() {
    await database.disconnect();
    await mongoServer.stop();
    await publisher.disconnect();
    await redisServer.close();
  });

  it('should fail to register due to invalid request', async () => {
    const registration = {
    };
    const res = await request(app)
            .post('/api/register')
            .send(registration);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(4);
  });

  it('should register', async () => {
    const registration = {
      username: 'newuser',
      password: 'testpass',
      email: 'newuser@herp-keeper.com',
      name: 'New User'
    };
    const res = await request(app)
            .post('/api/register')
            .send(registration);
    expect(res.statusCode).to.equal(200);
  });

});
