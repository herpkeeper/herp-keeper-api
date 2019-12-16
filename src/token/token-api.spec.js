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

describe('TokenApi', () => {

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
  let refreshToken;
  let refreshTokenNoUser;
  let refreshTokenBadToken;

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
    let t = await tokenFactory.createRefreshToken({
      username: 'user',
      role: 'member'
    });
    refreshToken = await refreshTokenCollection.create({
      username: 'user',
      token: t
    });
    t = await tokenFactory.createRefreshToken({
      username: 'nouser',
      roles: ['user']
    });
    refreshTokenNoUser = await refreshTokenCollection.create({
      username: 'nouser',
      token: t
    });
    refreshTokenBadToken = await refreshTokenCollection.create({
      username: 'user',
      token: 'bad'
    });
    const profile = {
      username: 'user',
      email: 'test@test.com',
      name: 'Name',
      password: 'goodpassword',
      role: 'member',
      active: true
    };
    await profileCollection.create(profile);
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

  it('should fail to refresh token due to invalid request', async () => {
    const tokenRequest = {
    };
    const res = await request(app)
          .post('/api/token')
          .send(tokenRequest);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(2);
  });

  it('should fail to refresh token due to token not found', async () => {
    const tokenRequest = {
      username: 'user',
      refreshToken: 'notfound'
    };
    const res = await request(app)
            .post('/api/token')
            .send(tokenRequest);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to refresh token');
  });

  it('should fail to refresh token due to invalid JWT', async () => {
    const tokenRequest = {
      username: refreshTokenBadToken.username,
      refreshToken: refreshTokenBadToken.token
    };
    const res = await request(app)
            .post('/api/token')
            .send(tokenRequest);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to refresh token');
  });

  it('should fail to refresh token due to profile not found', async () => {
    const tokenRequest = {
      username: refreshTokenNoUser.username,
      refreshToken: refreshTokenNoUser.token
    };
    const res = await request(app)
            .post('/api/token')
            .send(tokenRequest);
    expect(res.statusCode).to.equal(403);
  });

  it('should refresh token', async () => {
    const tokenRequest = {
      username: refreshToken.username,
      refreshToken: refreshToken.token
    };
    const res = await request(app)
            .post('/api/token')
            .send(tokenRequest);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body._id).to.exist;
    expect(res.body.username).to.equal('user');
    expect(res.body.email).to.equal('test@test.com');
    expect(res.body.name).to.equal('Name');
    expect(res.body.role).to.equal('member');
    expect(res.body.createdAt).to.exist;
    expect(res.body.refreshToken).to.exist;
    expect(res.body.accessToken).to.exist;
    expect(res.body.accessExpires).to.equal(300);
  });

});
