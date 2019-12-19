const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID;

const SpeciesCollection = require('./species-collection');
const profileSchema = require('../profile/profile-schema');
const ProfileCollection = require('../profile/profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.only('SpeciesCollection', () => {

  let speciesCollection;
  let database;
  let config;
  let mongoServer;
  let redisServer;
  let profileCollection;
  let profile;
  let publisher;

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
    config.set('database.url', uri);
    config.set('redis.url', 'redis://localhost:6400');
    publisher = new Publisher(config);
    profileSchema.publisher = publisher;
    database = new Database(config);
    await database.getConnection();
    profileCollection = new ProfileCollection(database);
    await profileCollection.createIndexes();
    profile = await profileCollection.create({
      username: 'user',
      password: 'pass',
      email: 'test@test.com',
      name: 'name',
      role: 'member',
      species: [{
        commonName: 'Common Name'
      }]
    });
  });

  after(async function() {
    await database.disconnect();
    await mongoServer.stop();
    await publisher.disconnect();
    await redisServer.close();
  });

  beforeEach(() => {
    speciesCollection = new SpeciesCollection(database, profileCollection);
  });

  it('should be created', () => {
    expect(speciesCollection.schema).to.exist;
    expect(speciesCollection.model).to.exist;
  });

  it('should fail to create location due to parent not found', async () => {
    await expect(speciesCollection.create(new ObjectID(), {
    })).to.be.rejectedWith(/Failed to create species/);
  });

  it('should create species', async () => {
    const res = await speciesCollection.create(profile._id, {
      commonName: 'Eastern Indigo Snake',
      class: 'Reptilia',
      order: 'Squamata',
      subOrder: 'Serpentes',
      genus: 'Drymarchon',
      species: 'couperi'
    });
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.commonName).to.equal('Eastern Indigo Snake');
  });

});
