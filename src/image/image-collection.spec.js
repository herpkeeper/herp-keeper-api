const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID

chai.use(chaiAsPromised);
const expect = chai.expect;

const ImageCollection = require('./image-collection');
const profileSchema = require('../profile/profile-schema');
const ProfileCollection = require('../profile/profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');

describe('ImageCollection', () => {

  let imageCollection;
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
      images: [{
        title: 'Image 1',
        contentType: 'image/png',
        fileName: 'test.png'
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
    imageCollection = new ImageCollection(database, profileCollection);
  });

  it('should be created', () => {
    expect(imageCollection.schema).to.exist;
    expect(imageCollection.model).to.exist;
  });

  it('should fail to get image due to profile not found', async () => {
    await expect(imageCollection.get(new ObjectID(), profile.images[0]._id)).to.be.rejectedWith(/Failed to get image, profile/);
  });

  it('should fail to get image due to image not found', async () => {
    await expect(imageCollection.get(profile._id, new ObjectID())).to.be.rejectedWith(/Failed to get image, image/);
  });

  it('should get image', async () => {
    const res = await imageCollection.get(profile._id, profile.images[0]._id);
    expect(res).to.exist;
  });

  it('should fail to create image due to profile not found', async () => {
    await expect(imageCollection.create(new ObjectID(), {
    })).to.be.rejectedWith(/Failed to create image, profile/);
  });

  it('should create image', async () => {
    const res = await imageCollection.create(profile._id, {
      title: 'Image 2',
      caption: 'Some caption',
      contentType: 'image/png',
      fileName: 'test.png'
    });
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.title).to.equal('Image 2');
    expect(res.caption).to.equal('Some caption');
    expect(res.contentType).to.equal('image/png');
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
  });

  it('should fail to update image due to profile not found', async () => {
    const toUpdate = profile.images[0];
    toUpdate.title = 'Updated Title';
    await expect(imageCollection.update(new ObjectID(), toUpdate)).to.be.rejectedWith(/Failed to update image, profile/);
  });

  it('should fail to update image due to image not found', async () => {
    const toUpdate = {
      _id: new ObjectID()
    };
    await expect(imageCollection.update(profile._id, toUpdate)).to.be.rejectedWith(/Failed to update image, image/);
  });

  it('should update image', async () => {
    const toUpdate = profile.images[0];
    toUpdate.title = 'Updated Title';
    toUpdate.caption = 'Updated caption';
    const res = await imageCollection.update(profile._id, toUpdate);
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.title).to.equal('Updated Title');
    expect(res.caption).to.equal('Updated caption');
    expect(res.contentType).to.equal('image/png');
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
  });

  it('should fail to remove image due to parent not found', async () => {
    await expect(imageCollection.remove(new ObjectID(), profile.images[0]._id)).to.be.rejectedWith(/Failed to remove image, profile/);
  });

  it('should fail to remove image due to image not found', async () => {
    await expect(imageCollection.remove(profile._id, new ObjectID())).to.be.rejectedWith(/Failed to remove image, image/);
  });

  it('should remove image', async () => {
    const res = await imageCollection.remove(profile._id, profile.images[0]._id);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profile.images[0]._id.toHexString());
  });

});
