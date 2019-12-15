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

const expect = chai.expect;

describe('ActivateAccountApi', () => {

  let app;
  let database;
  let config;
  let mongoServer;
  let redisServer;
  let profileCollection;
  let publisher;
  let mailer;
  let profile;

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
    await profileCollection.createIndexes();
    profile = await profileCollection.create({
      username: 'user1',
      email: 'user1@herp-keeper.com',
      name: 'User 1',
      password: 'testpassword',
      role: 'member',
      activationKey: 'goodkey',
      active: false
    });
    mailer = new Mailer(config);
    app = new App(config, mailer, {
      profileCollection
    }).app;
  });

  after(async function() {
    await database.disconnect();
    await mongoServer.stop();
    await publisher.disconnect();
    await redisServer.close();
  });

  it('should fail to activate account due to invalid request', async () => {
    const res = await request(app)
      .get('/api/activate-account');
    expect(res.statusCode).to.equal(422);
  });

  it('should fail to activate account due to profile not found', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'notfound', key: 'notfound' });
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to activate account');
  });

  it('should fail to activate account due to bad key', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'user1', key: 'badkey' });
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to activate account');
  });

  it('should activate account', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'user1', key: 'goodkey' });
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.username).to.equal(profile.username);
    expect(res.body.name).to.equal(profile.name);
    expect(res.body.email).to.equal(profile.email);
  });

});
