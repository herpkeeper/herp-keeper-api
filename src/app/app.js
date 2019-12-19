const express = require('express');
const router = require('express').Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const expressWinston = require('express-winston');
const helmet = require('helmet');
require('express-async-errors');

const Logger = require('../logger/logger');
const RegisterApi = require('../register/register-api');
const ActivateAccountApi = require('../activate-account/activate-account-api');
const AuthenticateApi = require('../authenticate/authenticate-api');
const TokenApi = require('../token/token-api');
const LogoutApi = require('../logout/logout-api');
const ImageApi = require('../image/image-api');
const LocationApi = require('../location/location-api');

class App {

  constructor(config, tokenFactory, mailer, imageStore, collections) {
    collections = collections || { };
    if (!config) {
      throw new Error('Config is not set');
    }
    if (!tokenFactory) {
      throw new Error('Token factory is not set');
    }
    if (!mailer) {
      throw new Error('Mailer is not set');
    }
    if (!imageStore) {
      throw new Error('Image store is not set');
    }
    if (!collections.profileCollection ||
        !collections.refreshTokenCollection ||
        !collections.imageCollection ||
        !collections.locationCollection) {
      throw new Error('Collections not properly setup');
    }

    this.log = Logger.getLogger('app:app');
    this.config = config;

    this._app = express();

    // Add middlewares
    this._app.use(helmet());
    this._app.use(bodyParser.json({limit: '50mb'}));
    this._app.use(cors());
    this._app.use(expressWinston.logger(Logger.getExpressLogger()));

    // Set things in app so routes can access them, do this for shared things instead of relying on bind.
    this._app.set('config', config);
    this._app.set('tokenFactory', tokenFactory);
    this._app.set('mailer', mailer);
    this._app.set('imageStore', imageStore);
    this._app.set('profileCollection', collections.profileCollection);
    this._app.set('refreshTokenCollection', collections.refreshTokenCollection);
    this._app.set('imageCollection', collections.imageCollection);
    this._app.set('locationCollection', collections.locationCollection);

    // Create routes
    this.registerApi = new RegisterApi(router);
    this.activateAccountApi = new ActivateAccountApi(router);
    this.authenticateApi = new AuthenticateApi(router);
    this.tokenApi = new TokenApi(router);
    this.logoutApi = new LogoutApi(router);
    this.imageApi = new ImageApi(router, tokenFactory);
    this.locationApi = new LocationApi(router, tokenFactory);

    this._app.use('/api', router);
  }

  async listen() {
    const server = await this._app.listen(this.config.get('app.port'));
    this.log.debug(`App listening on port ${this.config.get('app.port')}`);
    return server;
  }

  get app() { return this._app; }

}

module.exports = App;
