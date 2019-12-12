const chai = require('chai');

const Logger = require('./logger');

const expect = chai.expect;

describe('Logger', () => {

  it('should get logger', () => {
    const log = Logger.getLogger('test');
    expect(log).to.exist;
    log.debug('test %o', { test: 'test' });
  });

});
