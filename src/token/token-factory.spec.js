const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const jwt = require('jsonwebtoken');
const sleep = require('sleep-promise');

const TokenFactory = require('./token-factory');
const Config = require('../config/config');

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('TokenFactory', () => {

  let tokenFactory;
  let config;

  before(async () => {
    config = new Config('test');
    await config.load();
  });

  beforeEach(() => {
    tokenFactory = new TokenFactory(config);
  });

  it('should be created', () => {
    expect(tokenFactory.secret).to.equal('secret');
  });

  it('should get refresh expires seconds', () => {
    expect(TokenFactory.REFRESH_EXPIRES_SECONDS).to.equal(604800);
  });

  it('should get access expires seconds', () => {
    expect(TokenFactory.ACCESS_EXPIRES_SECONDS).to.equal(300);
  });

  it('should create refresh token', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const res = await tokenFactory.createRefreshToken(profile);
    expect(res).to.exist;
    const decoded = jwt.decode(res, {complete: true});
    expect(decoded).to.exist;
    expect(decoded.payload).to.exist;
    expect(decoded.payload.aud).to.equal('Herp Keeper User');
    expect(decoded.payload.iss).to.equal('Herp Keeper API');
    expect(decoded.payload.sub).to.equal('username');
    expect(decoded.payload.role).to.equal('member');
  });

  it('should create access token', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const res = await tokenFactory.createAccessToken(profile);
    expect(res).to.exist;
    const decoded = jwt.decode(res, {complete: true});
    expect(decoded).to.exist;
    expect(decoded.payload).to.exist;
    expect(decoded.payload.aud).to.equal('Herp Keeper User');
    expect(decoded.payload.iss).to.equal('Herp Keeper API');
    expect(decoded.payload.sub).to.equal('username');
    expect(decoded.payload.role).to.equal('member');
  });

  it('should fail to verify', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createAccessToken(profile);
    await expect(tokenFactory.verify(token, 'bad')).to.be.rejected;
  });

  it('should verify', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createAccessToken(profile);
    const res = await tokenFactory.verify(token, 'username');
    expect(res).to.be.true;
  });

  it('should verify and decode', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createAccessToken(profile);
    const res = await tokenFactory.verifyAndDecode(token);
    expect(res).to.exist;
    expect(res.sub).to.equal('username');
    expect(res.role).to.equal('member');
  });

  it('should verify and decode ignoring expiration', async function() {
    this.timeout(10000);
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createAccessToken(profile, '1 second');
    await sleep(1000);
    const res = await tokenFactory.verifyAndDecodeIgnoreExpiration(token);
    expect(res).to.exist;
    expect(res.sub).to.equal('username');
    expect(res.role).to.equal('member');
  });

});
