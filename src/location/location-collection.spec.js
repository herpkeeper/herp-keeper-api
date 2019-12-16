const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID;

const LocationCollection = require('../location/location-collection');
const profileSchema = require('../profile/profile-schema');
const ProfileCollection = require('../profile/profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('LocationCollection', () => {

  let locationCollection;
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
      locations: [{
        name: 'Location 1',
        geoLocation: {
          type: 'Point',
          coordinates: [1, 2]
        }
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
    locationCollection = new LocationCollection(database, profileCollection);
  });

  it('should be created', () => {
    expect(locationCollection.schema).to.exist;
    expect(locationCollection.model).to.exist;
  });

  it('should fail to create location due to parent not found', async () => {
    await expect(locationCollection.create(new ObjectID(), {
    })).to.be.rejectedWith(/Failed to create location/);
  });

  it('should create new location', async () => {
    const res = await locationCollection.create(profile._id, {
      name: 'Location 2',
      geoLocation: {
        type: 'Point',
        coordinates: [2, 3]
      },
      fullAddress: 'some address',
      imageId: new ObjectID()
    });
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.name).to.equal('Location 2');
  });

  it('should fail to update location due to parent not found', async () => {
    const toUpdate = profile.locations[0];
    toUpdate.name = 'Updated Location 1';
    await expect(locationCollection.update(new ObjectID(), toUpdate)).to.be.rejectedWith(/Failed to update location, profile/);
  });

  it('should fail to update location due to location not found', async () => {
    const toUpdate = {
      _id: new ObjectID()
    };
    await expect(locationCollection.update(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update location, location/);
  });

  it('should update location', async () => {
    const toUpdate = profile.locations[0];
    toUpdate.name = 'Updated Location 1';
    toUpdate.geoLocation.coordinates = [3, 4];
    const res = await locationCollection.update(profile._id, toUpdate);
    expect(res).to.exist;
    expect(res._id).to.equal(profile.locations[0]._id);
    expect(res.name).to.equal('Updated Location 1');
    expect(res.geoLocation.coordinates[0]).to.equal(3);
    expect(res.geoLocation.coordinates[1]).to.equal(4);
  });

  it('should fail to remove location due to parent not found', async () => {
    await expect(locationCollection.remove(new ObjectID(), profile.locations[0]._id)).to.be.rejectedWith(/Failed to remove location, profile/);
  });

  it('should fail to remove location due to location not found', async () => {
    await expect(locationCollection.remove(profile._id, new ObjectID())).to.be.rejectedWith(/Failed to remove location, location/);
  });

  it('should remove location', async () => {
    const res = await locationCollection.remove(profile._id, profile.locations[0]._id);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profile.locations[0]._id.toHexString());
  });

});
