const jwt = require('jsonwebtoken');

const Logger = require('../logger/logger');

class TokenFactory {

  constructor(config) {
    this.log = Logger.getLogger('token:token-factory');
    this.secret = config.get('jwt.secret');
  }

  /**
   * Create a token.
   */
  async create(profile, expires) {
    this.log.debug(`Creating token for ${profile.username} that expires in ${expires}`);

    const options = {
      audience: 'Herp Keeper User',
      issuer: 'Herp Keeper API',
      subject: profile.username,
      expiresIn: expires
    };

    const token = await jwt.sign({
      role: profile.role
    }, this.secret, options);

    return token;
  }

  /**
   * Create a refresh token.
   */
  async createRefreshToken(profile) {
    this.log.debug(`Creating refresh token for ${profile.username}`);

    return await this.create(profile, '7 days');
  }

  /**
   * Create an access token.
   */
  async createAccessToken(profile, expires) {
    expires = expires || '5 minutes';
    this.log.debug(`Creating access token for ${profile.username}`);
    return await this.create(profile, expires);
  }

  /**
   * Verify token.
   */
  async verify(token, username) {
    this.log.debug(`Attempt to verify token for ${username}`);

    try {
      await jwt.verify(
        token, this.secret,
        {
          audience: 'Herp Keeper User',
          issuer: 'Herp Keeper API',
          subject: username
        }
      );
    } catch (err) {
      this.log.warn(`Failed to verify token for ${username}: ${err}`);
      throw(err);
    }

    return true;
  }

  /**
   * Verify and decode.
   */
  async verifyAndDecode(token) {
    this.log.debug('Attempt to verify and decode token');

    const res = await jwt.verify(
      token, this.secret,
      {
        audience: 'Herp Keeper User',
        issuer: 'Herp Keeper API'
      }
    );
    return res;
  }

  /**
   * Verify and decode but ingore expiration.
   */
  async verifyAndDecodeIgnoreExpiration(token) {
    this.log.debug('Attempt to verify and decode token ignoring expiration');

    const res = await jwt.verify(
      token, this.secret,
      {
        audience: 'Herp Keeper User',
        issuer: 'Herp Keeper API',
        ignoreExpiration: true
      }
    );
    return res;
  }

  static get REFRESH_EXPIRES_SECONDS() { return 604800; }

  static get ACCESS_EXPIRES_SECONDS() { return 300; }

}

module.exports = TokenFactory;
