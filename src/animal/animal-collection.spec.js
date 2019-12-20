const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID;

const AnimalCollection = require('./animal-collection');
const profileSchema = require('../profile/profile-schema');
const ProfileCollection = require('../profile/profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.only('AnimalCollection', () => {

  let animalCollection;
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
    const locationId = new ObjectID();
    const speciesId = new ObjectID();
    const animalId = new ObjectID();
    profile = await profileCollection.create({
      username: 'user',
      password: 'pass',
      email: 'test@test.com',
      name: 'name',
      role: 'member',
      locations: [{
        _id: locationId,
        name: 'Location 1',
        geoLocation: {
          type: 'Point',
          coordinates: [0, 1]
        }
      }],
      species: [{
        _id: speciesId,
        commonName: 'Species 1'
      }],
      animals: [{
        name: 'Animal 1',
        speciesId: speciesId,
        locationId: locationId,
        images: [{
          imageId: new ObjectID(),
          default: true
        }, {
          imageId: new ObjectID()
        }],
        feedings: [{
          feedingDate: new Date(),
          type: 'Pinky mouse'
        }, {
          feedingDate: new Date(),
          type: 'Large rat'
        }]
      }, {
        name: 'Animal 2',
        speciesId: speciesId,
        locationId: locationId
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
    animalCollection = new AnimalCollection(database, profileCollection);
  });

  it('should be created', () => {
    expect(animalCollection.schema).to.exist;
    expect(animalCollection.model).to.exist;
  });

  it('should fail to create animal due to parent not found', async () => {
    await expect(animalCollection.create(new ObjectID(), {
    })).to.be.rejectedWith(/Failed to create animal, profile/);
  });

  it('should fail to create animal due to location not found', async () => {
    await expect(animalCollection.create(profile._id, {
      locationId: new ObjectID()
    })).to.be.rejectedWith(/Failed to create animal, location/);
  });

  it('should fail to create animal due to species not found', async () => {
    await expect(animalCollection.create(profile._id, {
      locationId: profile.locations[0]._id,
      speciesId: new ObjectID()
    })).to.be.rejectedWith(/Failed to create animal, species/);
  });

  it('should create animal', async () => {
    const res = await animalCollection.create(profile._id, {
      name: 'New Animal',
      locationId: profile.locations[0]._id,
      speciesId: profile.species[0]._id,
      images: [
      ]
    });
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.name).to.equal('New Animal');
  });

  it('should fail to update animal due to parent not found', async () => {
    const toUpdate = profile.animals[0];
    await expect(animalCollection.update(new ObjectID(), toUpdate)).to.be.rejectedWith(/Failed to update animal, profile/);
  });

  it('should fail to update animal due to animal not found', async () => {
    const toUpdate = {
      _id: new ObjectID()
    };
    await expect(animalCollection.update(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animal, animal/);
  });

  it('should fail to update animal due to location not found', async () => {
    const toUpdate = {
      _id: profile.animals[0]._id,
      locationId: new ObjectID()
    };
    await expect(animalCollection.update(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animal, location/);
  });

  it('should fail to update animal due to species not found', async () => {
    const toUpdate = {
      _id: profile.animals[0]._id,
      locationId: profile.animals[0].locationId,
      speciesId: new ObjectID()
    };
    await expect(animalCollection.update(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animal, species/);
  });

  it('should update animal', async () => {
    const toUpdate = profile.animals[0];
    toUpdate.name = 'Updated Name';
    toUpdate.images = [{
      imageId: 'id3',
      default: true
    }];
    const res = await animalCollection.update(profile._id, toUpdate);
    expect(res).to.exist;
    expect(res._id).to.equal(profile.animals[0]._id);
    expect(res.name).to.equal('Updated Name');
    expect(res.images.length).to.equal(1);
  });

  it('should fail to update animals due to parent not found', async () => {
    const toUpdate = [ profile.animals[0], profile[1] ];
    await expect(animalCollection.updateMulti(new ObjectID(), toUpdate)).to.be.rejectedWith(/Failed to update animals, profile/);
  });

  it('should fail to update animals due to animal not found', async () => {
    const toUpdate = [ profile.animals[0], { _id: new ObjectID() } ];
    await expect(animalCollection.updateMulti(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animals, animal/);
  });

  it('should fail to upate animals due to location not found', async () => {
    const toUpdate = [profile.animals[0], {
      _id: profile.animals[1]._id,
      locationId: new ObjectID()
    }];
    await expect(animalCollection.updateMulti(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animals, location/);
  });

  it('should fail to update animals due to species not found', async () => {
    const toUpdate = [profile.animals[0], {
      _id: profile.animals[1]._id,
      locationId: profile.animals[1].locationId,
      speciesId: new ObjectID()
    }];
    await expect(animalCollection.updateMulti(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update animals, species/);
  });

  it('should update animals', async () => {
    const toUpdate1 = profile.animals[0];
    toUpdate1.name = 'Updated again';
    const toUpdate2 = profile.animals[1];
    toUpdate2.feedings = [{
      feedingDate: new Date(),
      quantity: 1,
      type: 'type'
    }, {
      feedingDate: new Date(),
      quantity: 1,
      type: 'type'
    }];
    const toUpdate = [ toUpdate1, toUpdate2 ];
    const res = await animalCollection.updateMulti(profile._id, toUpdate);
    expect(res).to.exist;
    expect(res.length).to.equal(3);
    expect(res[0].name).to.equal('Updated again');
    expect(res[1].feedings.length).to.equal(2);
  });

  it('should fail to remove animal due to parent not found', async () => {
    await expect(animalCollection.remove(new ObjectID(), profile.animals[0]._id)).to.be.rejectedWith(/Failed to remove animal, profile/);
  });

  it('should fail to remove animal due to animal not found', async () => {
    await expect(animalCollection.remove(profile._id, new ObjectID())).to.be.rejectedWith(/Failed to remove animal, animal/);
  });

  it('should remove animal', async () => {
    const res = await animalCollection.remove(profile._id, profile.animals[0]._id);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profile.animals[0]._id.toHexString());
  });

});
