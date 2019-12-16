const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ObjectID = require('mongodb').ObjectID;

const RefreshTokenCollection = require('./refresh-token-collection');
const Config = require('../config/config');
const Database = require('../db/database');

const expect = chai.expect;

describe('RefreshTokenCollection', () => {

  let database;
  let config;
  let mongoServer;
  let refreshTokenCollection;
  let refreshToken1 = null;
  let refreshToken2 = null;
  let refreshToken3 = null;
  let refreshToken4 = null;

  before(async function() {
    this.timeout(10000);
    mongoServer = new MongoMemoryServer();
    const uri = await mongoServer.getConnectionString();
    config = new Config('test');
    config.set('database.url', uri);
    database = new Database(config);
    await database.getConnection();
    refreshTokenCollection = new RefreshTokenCollection(database);
    refreshToken1 = await refreshTokenCollection.create({
      username: 'user',
      token: 'token1'
    });
    refreshToken2 = await refreshTokenCollection.create({
      username: 'user',
      token: 'token2'
    });
    refreshToken3 = await refreshTokenCollection.create({
      username: 'user2',
      token: 'token3'
    });
  });

  after(async function() {
    await database.disconnect();
    await mongoServer.stop();
  });

  it('should be created', () => {
    expect(refreshTokenCollection.schema).to.exist;
    expect(refreshTokenCollection.model).to.exist;
  });

  it('should create indexes', async () => {
    await refreshTokenCollection.createIndexes();
  });

  it('should find by username', async () => {
    const res = await refreshTokenCollection.findByUsername('user');
    expect(res.length).to.equal(2);
  });

  it('should find by username and token', async () => {
    const res = await refreshTokenCollection.findByUsernameAndToken('user', 'token1');
    expect(res).to.exist;
    expect(res.username).to.equal('user');
    expect(res.token).to.equal('token1');
  });

  it('should create', async () => {
    const refreshToken = {
      username: 'user',
      token: 'token4'
    };
    const res = await refreshTokenCollection.create(refreshToken);
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.username).to.equal('user');
    expect(res.token).to.equal('token4');
    expect(res.createdAt).to.exist;
    refreshToken4 = res;
  });

  it('should remove by username and token', async () => {
    let res = null;
    res = await refreshTokenCollection.removeByUsernameAndToken('user', 'token2');
    expect(res).to.equal(1);
    res = await refreshTokenCollection.findByUsername('user');
    expect(res.length).to.equal(2);
  });

  it('should remove by username', async () => {
    let res = null;
    res = await refreshTokenCollection.removeByUsername('user');
    expect(res).to.equal(2);
    res = await refreshTokenCollection.findByUsername('user');
    expect(res.length).to.equal(0);
  });

});
