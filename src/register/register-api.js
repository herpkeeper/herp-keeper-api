const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');
const uuidv4 = require('uuid/v4');

const Logger = require('../logger/logger');

const checkRegistration = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  email: {
    isEmail: true
  },
  username: {
    isLength: {
      options: { min: 5 }
    }
  },
  password: {
    isLength: {
      options: { min: 8 }
    }
  },
  name: {
    isLength: {
      options: { min: 1 }
    }
  }
});

class RegisterApi {

  constructor(router) {
    this.log = Logger.getLogger('register:register-api');
    this.router = router;
    es6BindAll(this, [
      'register'
    ]);
    this.router.post('/register', checkRegistration, this.register);
  }

  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Validation failed for registration: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const profileCollection = req.app.get('profileCollection');
      const mailer = req.app.get('mailer');
      const config = req.app.get('config');
      this.log.debug(`Attempt to register profile ${req.body.email}`);
      // Create an activation key
      const activationKey = uuidv4();
      // Now create our profile with a role of member
      const profile = {
        username: req.body.username,
        password: req.body.password,
        name: req.body.name,
        email: req.body.email,
        role: 'member',
        activationKey: activationKey
      };
      const newProfile = await profileCollection.create(profile);
      this.log.debug(`New profile for ${newProfile.username} created with id of ${newProfile._id}`);
      // Send back a limited set of data
      res.send({
        username: profile.username,
        email: profile.email,
        name: profile.name
      });
      // Now send activation email.
      const activationUrl = `${config.get('activationUrl')}?username=${profile.username}&key=${profile.activationKey}`;
      const locals = {
        subHeader: 'Activate Account',
        name: profile.name,
        activationUrl: activationUrl
      };
      await mailer.send(profile.email, 'activate-profile', locals);
    }
  }

}

module.exports = RegisterApi;
