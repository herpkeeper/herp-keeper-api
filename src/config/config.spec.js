const chai = require('chai');

const Config = require('./config');

const expect = chai.expect;

describe('Config', () => {

  let config;

  beforeEach(() => {
    config = new Config('test');
  });

  it('should load', async () => {
    const res = await config.load();
    expect(res).to.exist;
    expect(res.app.port).to.equal(8080);
    expect(config.get('app.port')).to.equal(8080);
  });

  it('should get and set', () => {
    config.set('some.key', 'test');
    expect(config.get('some.key')).to.equal('test');
  });

});
