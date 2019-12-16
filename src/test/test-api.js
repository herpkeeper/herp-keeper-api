const { MongoMemoryServer } = require('mongodb-memory-server');
const RedisServer = require('redis-server');

const App = require('../app/app');
const Config = require('../config/config');
const profileSchema = require('../profile/profile-schema');
const Publisher = require('../messaging/publisher');
const Database = require('../db/database');
const ProfileCollection = require('../profile/profile-collection');
const RefreshTokenCollection = require('../token/refresh-token-collection');
const LocationCollection = require('../location/location-collection');
const Mailer = require('../mail/mailer');
const TokenFactory = require('../token/token-factory');

let app;
let database;
let config;
let mongoServer;
let redisServer;
let publisher;
let profileCollection;
let refreshTokenCollection;
let locationCollection;
let mailer;
let tokenFactory;

async function setup() {
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
  locationCollection = new LocationCollection(database, profileCollection);
  await profileCollection.createIndexes();
  await refreshTokenCollection.createIndexes();
  mailer = new Mailer(config);
  tokenFactory = new TokenFactory(config);
  app = new App(config, tokenFactory, mailer, {
    profileCollection,
    refreshTokenCollection,
    locationCollection
  }).app;
  return app;
}

async function tearDown() {
  await database.disconnect();
  await mongoServer.stop();
  await publisher.disconnect();
  await redisServer.close();
}

module.exports = {
  setup: setup,
  tearDown: tearDown
};
