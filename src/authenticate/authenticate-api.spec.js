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

describe('AuthentiateApi', () => {

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
    const profile1 = {
      username: 'activeuser',
      email: 'test@test.com',
      name: 'Name',
      password: 'goodpassword',
      role: 'member',
      active: true
    };
    await profileCollection.create(profile1);
    const profile2 = {
      username: 'inactiveuser',
      email: 'test2@test.com',
      name: 'Name',
      password: 'goodpassword',
      role: 'member',
      active: false
    };
    await profileCollection.create(profile2);
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

  it('should fail to authenticate due to invalid request', async () => {
    const credentials = {
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(2);
  });

  it('should fail to authenticate due to invalid user', async () => {
    const credentials = {
      username: 'baduser',
      password: 'badpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should fail to authenticate due to invalid password', async () => {
    const credentials = {
      username: 'activeuser',
      password: 'badpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should fail to authenticate due to inactive', async () => {
    const credentials = {
      username: 'inactiveuser',
      password: 'goodpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should authenticate', async () => {
    const credentials = {
      username: 'activeuser',
      password: 'goodpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body._id).to.exist;
    expect(res.body.username).to.equal('activeuser');
    expect(res.body.email).to.equal('test@test.com');
    expect(res.body.name).to.equal('Name');
    expect(res.body.role).to.equal('member');
    expect(res.body.createdAt).to.exist;
    expect(res.body.refreshToken).to.exist;
    expect(res.body.accessToken).to.exist;
    expect(res.body.accessExpires).to.equal(300);
  });

});
