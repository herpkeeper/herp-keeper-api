const Logger = require('../src/logger/logger');
const Config = require('../src/config/config');
const Database = require('../src/db/database');
const ProfileCollection = require('../src/profile/profile-collection');
const CommandLine = require('./command-line');
const Prompt = require('./prompt');

const log = Logger.getLogger('utils:add-admin-user');
let db;

(async () => {
  try {
    log.info('Attempting to add admin user');

    const commandLine = new CommandLine();
    const prompt = new Prompt();

    // Add options
    commandLine.options.push(
      { name: 'username', type: String, alias: 'u', type: String },
      { name: 'password', type: String, alias: 'p' }
    );

    // Process command line
    const commandLineOptions = commandLine.process();

    // Prompt for any unset options
    while (!commandLineOptions.username) {
      commandLineOptions.username = await prompt.promptFor('Username', 'username');
    }

    while (!commandLineOptions.password) {
      commandLineOptions.password = await prompt.promptForPass('Password', 'password');
    }

    // Read config
    const config = new Config(commandLineOptions.env);
    await config.load();

    // Connect to database
    db = new Database(config);
    await db.getConnection();
    const profileCollection = new ProfileCollection(db);
    await profileCollection.createIndexes();

    // Create user
    const adminUser = {
      username: commandLineOptions.username,
      password: commandLineOptions.password,
      email: 'admin@herp-keeper.com',
      name: 'Admin User',
      role: 'admin',
      active: true
    }
    const res = await profileCollection.create(adminUser);

    // Disconnect from database
    await db.disconnect();

    log.info(`User ${adminUser.username} created`);
  } catch (err) {
    log.error(`Failed to add admin user: ${err}`);
    if (db) {
      db.disconnect();
    }
    process.exit(0);
  }
})();
