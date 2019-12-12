const chai = require('chai');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Database = require('./database');
const Config = require('../config/config');

const expect = chai.expect;

describe('Database', () => {

  let database;
  let config;
  let mongoServer;

  before(async function() {
    this.timeout(10000);
    mongoServer = new MongoMemoryServer();
    const uri = await mongoServer.getConnectionString();
    config = new Config('test');
    config.set('database.url', uri);
  });

  after(async function() {
    await mongoServer.stop();
  });

  beforeEach(() => {
    database = new Database(config);
  });

  it('should not fail to disconnect if not connected', async () => {
    await database.disconnect();
    expect(database.connection).to.not.exist;
  });

  it('should get connection and close', async () => {
    let res = await database.getConnection();
    expect(res).to.exist;
    expect(database.connection).to.exist;
    res = await database.getConnection();
    expect(res).to.exist;
    expect(database.connection).to.exist;
    await database.disconnect();
    expect(database.connection).to.not.exist;
  });

});
