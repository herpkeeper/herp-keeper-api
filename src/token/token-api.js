const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const Logger = require('../logger/logger');
const TokenFactory = require('./token-factory');

const checkTokenRequest = checkSchema({
  username: {
    isLength: {
      options: { min: 1 }
    }
  },
  refreshToken: {
    isLength: {
      options: { min: 1 }
    }
  }
});

class TokenApi {

  constructor(router) {
    this.log = Logger.getLogger('token:token-api');
    this.router = router;
    es6BindAll(this, [
      'refreshToken'
    ]);
    this.router.post('/token', checkTokenRequest, this.refreshToken);
  }

  async refreshToken(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Validation failed for refresh token: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const profileCollection = req.app.get('profileCollection');
      const refreshTokenCollection = req.app.get('refreshTokenCollection');
      const tokenFactory = req.app.get('tokenFactory');
      this.log.debug(`Attempting to refresh token for ${req.body.username}`);
      // First try to find token
      const token = await refreshTokenCollection.findByUsernameAndToken(req.body.username,
                                                                        req.body.refreshToken);
      if (token) {
        try {
          // Now verify token
          await tokenFactory.verify(req.body.refreshToken, req.body.username);
          // Now get profile
          const profile = await profileCollection.findByUsername(req.body.username);
          if (profile) {
            const accessToken = await tokenFactory.createAccessToken(profile);
            const account = {
              _id: profile._id,
              username: profile.username,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              refreshToken: req.body.refreshToken,
              accessToken: accessToken,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              accessExpires: TokenFactory.ACCESS_EXPIRES_SECONDS
            };
            res.send(account);
          } else {
            this.log.warn(`Failed to refresh token for user ${req.body.username}, profile not found`);
            res.status(403).send({ error: { message: 'Failed to refresh token' } });
          }
        } catch (err) {
          this.log.warn(`Failed to refresh token for user ${req.body.username}, ${err}`);
          res.status(403).send({ error: { message: 'Failed to refresh token' } });
        }
      } else {
        this.log.warn(`Failed to refresh token for user ${req.body.username}, token not found`);
        res.status(403).send({ error: { message: 'Failed to refresh token' } });
      }
    }
  }

}

module.exports = TokenApi;
