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

class App {

  constructor(config, mailer, collections) {
    this.collections = collections || { };
    if (!config) {
      throw new Error('Config is not set');
    }
    if (!mailer) {
      throw new Error('Mailer is not set');
    }
    if (!collections.profileCollection) {
      throw new Error('Collections not properly setup');
    }

    this._app = express();

    // Add middlewares
    this._app.use(helmet());
    this._app.use(bodyParser.json({limit: '50mb'}));
    this._app.use(cors());
    this._app.use(expressWinston.logger(Logger.getExpressLogger()));

    // Set things in app so routes can access them, do this for shared things instead of relying on bind.
    this._app.set('config', config);
    this._app.set('mailer', mailer);
    this._app.set('profileCollection', collections.profileCollection);

    // Create routes
    this.registerApi = new RegisterApi(router);
    this.activateAccountApi = new ActivateAccountApi(router);

    this._app.use('/api', router);
  }

  get app() { return this._app; }

}

module.exports = App;
