const Logger = require('../logger/logger');

const log = Logger.getLogger('middleware:check-jwt');

module.exports = (options) => {
  return async (req, res, next) => {
    log.debug('Checking JWT');
    const tokenFactory = options.tokenFactory;
    // First check for Authorization header
    if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2) {
        const scheme = parts[0];
        const token = parts[1];
        if (/^Bearer$/i.test(scheme)) {
          // Now we can verify our token
          let decoded = null;
          try {
            decoded = await tokenFactory.verifyAndDecode(token);
          } catch (err) {
            log.error(`Failed to verify token ${err}`);
            res.status(401).json({ error: { message: 'Could not verify token' } });
          }
          // JWT now verified and decoded
          if (decoded) {
            let rolesPassed = true;
            if (options.roles && options.roles.length > 0) {
              rolesPassed = false;
              for (let role of options.roles) {
                rolesPassed = decoded.role === role;
                if (rolesPassed) {
                  break;
                }
              }
            }
            if (rolesPassed) {
              req.user = decoded.sub;
              req.role = decoded.role;
              next();
            } else {
              log.error('Check JWT failed, role is not authorized');
              res.status(403).json({ error: { message: 'Role is not authorized' } });
            }
          }
        } else {
          log.error('Check JWT failed, invalid authorization scheme');
          res.status(401).json({ error: { message: 'Invalid authorization scheme' } });
        }
      } else {
        log.error('Check JWT failed, malformed authorization header');
        res.status(401).json({ error: { message: 'Malformed authorization header' } });
      }
    } else {
      log.error('Check JWT failed, no authorization header');
      res.status(401).json({ error: { message: 'No authorization header' } });
    }
  };
};
