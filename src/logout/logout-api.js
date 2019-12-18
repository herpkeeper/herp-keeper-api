const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const Logger = require('../logger/logger');

const checkLogoutRequest = checkSchema({
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

class LogoutApi {

  constructor(router) {
    this.log = Logger.getLogger('logout:logout-api');
    this.router = router;

    es6BindAll(this, [
      'logout'
    ]);

    this.router.post('/logout', checkLogoutRequest, this.logout);
  }

  async logout(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.log.warn('Failed to logout due to validation errors: %o', errors);
      res.status(422).json({ errors: errors.array() });
    } else {
      const tokenFactory = req.app.get('tokenFactory');
      this.log.debug(`Attempting to logout for ${req.body.username}`);
      try {
        const refreshTokenCollection = req.app.get('refreshTokenCollection');
        await tokenFactory.verify(req.body.refreshToken, req.body.username);
        const n = await refreshTokenCollection.removeByUsernameAndToken(req.body.username,
                                                                        req.body.refreshToken);
        if (n < 1) {
          this.log.warn(`Failed to logout, could not delete token for for ${req.body.username}`);
          res.status(404).json({ error: { message: 'Failed to logout' } });
        } else {
          this.log.debug(`Successfully logged out for ${req.body.username}`);
          res.send({ result: true });
        }
      } catch (err) {
        this.log.warn(`Failed to logout for ${req.body.username}: ${err}`);
        res.status(404).json({ error: { message: 'Failed to logout' } });
      }
    }
  }

}

module.exports = LogoutApi;
