const Logger = require('./logger/logger');
const Config = require('./config/config');
const Database = require('./db/database');
const S3 = require('./aws/s3');
const Publisher = require('./messaging/publisher');
const profileSchema = require('./profile/profile-schema');
const ProfileCollection = require('./profile/profile-collection');
const RefreshTokenCollection = require('./token/refresh-token-collection');
const LocationCollection = require('./location/location-collection');
const Mailer = require('./mail/mailer');
const TokenFactory = require('./token/token-factory');
const App = require('./app/app');
const WsServer = require('./ws/ws-server');

const log = Logger.getLogger('server');
const env = process.env.API_ENV || 'prod';

let config;
let database;
let s3;
let publisher;
let profileCollection;
let refreshTokenCollection;
let locationCollection;
let mailer;
let tokenFactory;
let app;
let server;
let wsServer;

log.debug('Starting server');

async function shutdown() {
  log.debug('Shutting down');

  if (wsServer) {
    wsServer.stop();
  }

  if (server) {
    await server.close();
  }

  if (database) {
    await database.disconnect();
  }

  if (publisher) {
    await publisher.disconnect();
  }
}

// Shutdown
process.on('SIGINT', async function() {
  await shutdown();
});

// Run everything in an async context
(async () => {
  try {
    // First load config
    config = new Config(env);
    await config.load();

    // Connect to database
    database = new Database(config);
    await database.getConnection();
    log.debug('Connected to database');

    // Check S3 and make sure everything is good.
    s3 = new S3(config);
    const s3Bucket = config.get('aws.s3.bucket');
    const bucketExists = await s3.bucketExists(s3Bucket);
    if (!bucketExists) {
      log.warn(`S3 bucket ${s3Bucket} does not exist, let's create it`);
      await s3.createBucket(s3Bucket);
    }

    // Create publisher and attach it to profile schema
    publisher = new Publisher(config);
    profileSchema.publisher = publisher;

    // Create collections
    profileCollection = new ProfileCollection(database);
    refreshTokenCollection = new RefreshTokenCollection(database);
    locationCollection = new LocationCollection(database, profileCollection);

    // Create indexes
    await profileCollection.createIndexes();
    await refreshTokenCollection.createIndexes();

    // Create mailer
    mailer = new Mailer(config);

    // Create token factory
    tokenFactory = new TokenFactory(config);

    // Create app and listen
    app = new App(config, tokenFactory, mailer, {
      profileCollection,
      refreshTokenCollection,
      locationCollection
    });
    server = await app.listen();

    // Now create websocket server
    wsServer = new WsServer(server, tokenFactory);
    wsServer.start();
  } catch (err) {
    log.error(`Failed to start server: ${err}`);
    await shutdown();
  }
})();
