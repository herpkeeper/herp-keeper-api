const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');
const S3rver = require('s3rver');

const App = require('../app/app');
const Config = require('../config/config');
const profileSchema = require('../profile/profile-schema');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');
const ProfileCollection = require('../profile/profile-collection');
const RefreshTokenCollection = require('../token/refresh-token-collection');
const ImageCollection = require('../image/image-collection');
const LocationCollection = require('../location/location-collection');
const Mailer = require('../mail/mailer');
const TokenFactory = require('../token/token-factory');
const S3 = require('../aws/s3');
const ImageStore = require('../image/image-store');

let app;
let database;
let config;
let mongoServer;
let redisServer;
let publisher;
let profileCollection;
let refreshTokenCollection;
let imageCollection;
let locationCollection;
let mailer;
let tokenFactory;
let s3;
let imageStore;
let s3Server;

async function setup() {
  redisServer = new RedisServer({
    port: 6400,
    bin: '/usr/local/bin/redis-server'
  });
  s3Server = new S3rver({
    port: 10001,
    hostname: 'localhost',
    silent: false,
    directory: '/tmp/s3rver_test_directory'
  });
  await s3Server.run();
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
  imageCollection = new ImageCollection(database, profileCollection);
  locationCollection = new LocationCollection(database, profileCollection);
  await profileCollection.createIndexes();
  await refreshTokenCollection.createIndexes();
  mailer = new Mailer(config);
  tokenFactory = new TokenFactory(config);
  s3 = new S3(config);
  await s3.createBucket(config.get('aws.s3.bucket'));
  imageStore = new ImageStore(s3, config.get('aws.s3.bucket'));
  app = new App(config, tokenFactory, mailer, imageStore, {
    profileCollection,
    refreshTokenCollection,
    imageCollection,
    locationCollection
  }).app;
  return app;
}

async function tearDown() {
  await database.disconnect();
  await mongoServer.stop();
  await publisher.disconnect();
  await redisServer.close();
  s3Server.reset();
  await s3Server.close();
}

module.exports = {
  setup: setup,
  tearDown: tearDown
};
