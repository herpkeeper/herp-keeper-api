const chai = require('chai');

const Mailer = require('./mailer');
const Config = require('../config/config');

const expect = chai.expect;

describe('Mailer', () => {

  let mailer;
  let config;

  before(async () => {
    config = new Config('test');
    await config.load();
    mailer = new Mailer(config);
  });

  it('should send', async function() {
    this.timeout(10000);
    const res = await mailer.send('scott@herp-keeper.com', 'activate-profile', {
      subHeader: 'Activate Account',
      name: 'Test User',
      activationUrl: 'http://localhost:4200/activate-account?user=user&key=key'
    });
    expect(res).to.exist;
  });

});
