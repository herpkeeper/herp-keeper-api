const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const ObjectID = require('mongodb').ObjectID;

const profileSchema = require('./profile-schema');
const ProfileCollection = require('./profile-collection');
const Config = require('../config/config');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('ProfileCollection', () => {

  let database;
  let config;
  let mongoServer;
  let redisServer;
  let profileCollection;
  let profiles;
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
    const model = profileCollection.model;
    profiles = await model.create([{
      username: 'user1',
      password: 'testpass',
      name: 'User 1',
      email: 'user1@herp-keeper.com',
      role: 'member',
      activationKey: 'key'
    }, {
      username: 'user2',
      password: 'testpass',
      name: 'User 2',
      email: 'user2@herp-keeper.com',
      role: 'member',
      activationKey: 'key'
    }, {
      username: 'user3',
      password: 'testpass',
      name: 'User 3',
      email: 'user3@herp-keeper.com',
      role: 'member',
      activationKey: 'key'
    }, {
      username: 'user4',
      password: 'testpass',
      name: 'User 4',
      email: 'user4@herp-keeper.com',
      role: 'member',
      activationKey: 'key'
    }]);
  });

  after(async function() {
    await database.disconnect();
    await mongoServer.stop();
    await publisher.disconnect();
    await redisServer.close();
  });

  beforeEach(() => {
    profileSchema.publisher = publisher;
    profileCollection = new ProfileCollection(database, publisher);
  });

  it('should be created', () => {
    expect(profileCollection.schema).to.exist;
    expect(profileCollection.model).to.exist;
  });

  it('should get total count', async () => {
    const res = await profileCollection.count();
    expect(res).to.equal(4);
  });

  it('should get count with query', async () => {
    const res = await profileCollection.count({ username: profiles[0].username });
    expect(res).to.equal(1);
  });

  it('should find all', async () => {
    const res = await profileCollection.find();
    expect(res.length).to.equal(4);
  });

  it('should find with query', async () => {
    const res = await profileCollection.find({ username: profiles[0].username });
    expect(res.length).to.equal(1);
    expect(res[0].username).to.equal(profiles[0].username);
  });

  it('should find with skip and limit', async () => {
    const res = await profileCollection.find({}, { skip: 1, limit: 2 });
    expect(res.length).to.equal(2);
  });

  it('should get', async () => {
    const res = await profileCollection.get(profiles[0]._id);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profiles[0]._id.toHexString());
    expect(res.username).to.equal(profiles[0].username);
    expect(res.name).to.equal(profiles[0].name);
    expect(res.email).to.equal(profiles[0].email);
    expect(res.role).to.equal('member');
    expect(res.password).to.exist;
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
  });

  it('should create new', async () => {
    const profile = {
      username: 'newuser',
      password: 'newpassword',
      name: 'New User',
      email: 'newuser@herp-keeper.com',
      role: 'member'
    };
    const res = await profileCollection.create(profile);
    expect(res).to.exist;
    expect(res._id).to.exist;
    expect(res.username).to.equal(profile.username);
    expect(res.name).to.equal(profile.name);
    expect(res.email).to.equal(profile.email);
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
    expect(res.password).to.exist;
    expect(res.password).to.not.equal('newpassword');
    expect(res.role).to.equal('member');
    expect(res.active).to.be.false;
    expect(res.foodTypes).to.exist;
    expect(res.foodTypes.length).to.equal(0);
    expect(res.locations).to.exist;
    expect(res.locations.length).to.equal(0);
    expect(res.species).to.exist;
    expect(res.species.length).to.equal(0);
    expect(res.animals).to.exist;
    expect(res.animals.length).to.equal(0);
    expect(res.images).to.exist;
    expect(res.images.length).to.equal(0);
  });

  it('should fail to update due to profile not found', async () => {
    await expect(profileCollection.update({ _id: new ObjectID() })).to.be.rejectedWith(/Could not find profile/);
  });

  it('should update', async () => {
    const p = profiles[0];
    const previousPassword = profiles[0].password;
    p.name = 'New Name 1';
    p.email = 'updatedemail1@herp-keeper.com',
    p.password = 'newpassword';
    p.foodTypes = [ 'type1', 'type2' ];
    const res = await profileCollection.update(p);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profiles[0]._id.toHexString());
    expect(res.username).to.equal(profiles[0].username);
    expect(res.name).to.equal(profiles[0].name);
    expect(res.email).to.equal(profiles[0].email);
    expect(res.password).to.exist;
    expect(res.password).to.not.equal('newpassword');
    expect(res.password).to.not.equal(previousPassword);
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
    expect(res.role).to.equal('member');
    expect(res.foodTypes.length).to.equal(2);
  });

  it('should update but not change password and should not break with no publisher', async () => {
    profileSchema.publisher = null;
    const p = profiles[1];
    p.name = 'New Name 2';
    p.email = 'updatedemail2@herp-keeper.com',
    p.foodTypes = [ 'type1', 'type2' ];
    const res = await profileCollection.update(p);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profiles[1]._id.toHexString());
    expect(res.username).to.equal(profiles[1].username);
    expect(res.name).to.equal(profiles[1].name);
    expect(res.email).to.equal(profiles[1].email);
    expect(res.password).to.exist;
    expect(res.password).to.equal(profiles[1].password);
    expect(res.createdAt).to.exist;
    expect(res.updatedAt).to.exist;
    expect(res.role).to.equal('member');
    expect(res.foodTypes.length).to.equal(2);
  });

  it('should fail to activate', async () => {
    const p = profiles[1];
    await expect(profileCollection.activate(p._id, 'bad')).to.be.rejectedWith(/Failed to activate profile/);
  });

  it('should activate', async () => {
    const p = profiles[0];
    const res = await profileCollection.activate(p._id, p.activationKey);
    expect(res).to.exist;
    expect(res.active).to.be.true;
    expect(res.activationKey).to.not.exist;
  });

  it('should remove', async () => {
    let res = await profileCollection.remove(profiles[3]._id);
    expect(res).to.exist;
    expect(res._id.toHexString()).to.equal(profiles[3]._id.toHexString());
    res = await profileCollection.get(profiles[3]._id);
    expect(res).to.not.exist;
  });

  it('should find by username', async () => {
    let res = await profileCollection.findByUsername(profiles[0].username);
    expect(res).to.exist;
    expect(res.username).to.equal(profiles[0].username);
  });

  it('should find by id', async () => {
    let res = await profileCollection.findById(profiles[0]._id);
    expect(res).to.exist;
    expect(res.username).to.equal(profiles[0].username);
  });

  it('should find by username and id', async () => {
    let res = await profileCollection.findByUsernameAndId(profiles[0].username, profiles[0]._id);
    expect(res).to.exist;
    expect(res.username).to.equal(profiles[0].username);
  });

});
