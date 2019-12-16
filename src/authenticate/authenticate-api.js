const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');
const bcrypt = require('bcryptjs');

const Logger = require('../logger/logger');
const TokenFactory = require('../token/token-factory');

const checkCredentials = checkSchema({
  username: {
    isLength: {
      options: { min: 1 }
    }
  },
  password: {
    isLength: {
      options: { min: 1 }
    }
  }
});

class AuthenticateApi {

  constructor(router) {
    this.log = Logger.getLogger('authenticate:authenticate-api');
    this.router = router;
    es6BindAll(this, [
      'authenticate'
    ]);
    this.router.post('/authenticate', checkCredentials, this.authenticate);
  }

  async authenticate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Validation failed for authentication: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const profileCollection = req.app.get('profileCollection');
      this.log.debug(`Attempting to authenticate ${req.body.username}`);
      // First get proile
      const profile = await profileCollection.findByUsername(req.body.username);
      if (profile) {
        // Now check password
        const match = await bcrypt.compare(req.body.password, profile.password);
        if (match) {
          // Now check active
          if (profile.active) {
            const tokenFactory = req.app.get('tokenFactory');
            const refreshTokenCollection = req.app.get('refreshTokenCollection');
            // Generate JWTs and build result
            const refreshToken = await tokenFactory.createRefreshToken(profile);
            const accessToken = await tokenFactory.createAccessToken(profile);
            const account = {
              _id: profile._id,
              username: profile.username,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              refreshToken: refreshToken,
              accessToken: accessToken,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              accessExpires: TokenFactory.ACCESS_EXPIRES_SECONDS
            };
            // Now save refresh token
            await refreshTokenCollection.create({
              username: profile.username,
              token: refreshToken
            });
            res.send(account);
          } else {
            this.log.warn(`Failed to authenticate ${req.body.username}, profile not active`);
            res.status(403).send({ error: { message: 'Failed to authenticate' } });
          }
        } else {
          this.log.warn(`Failed to authenticate ${req.body.username}, invalid password`);
          res.status(403).send({ error: { message: 'Failed to authenticate' } });
        }
      } else {
        this.log.warn(`Failed to authenticate ${req.body.username}, profile does not exist`);
        res.status(403).send({ error: { message: 'Failed to authenticate' } });
      }
    }
  }

}

module.exports = AuthenticateApi;
