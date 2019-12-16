const chai = require('chai');
const sinon = require('sinon');

const checkJwt = require('./check-jwt');
const Config = require('../config/config');
const TokenFactory = require('../token/token-factory');

const expect = chai.expect;

describe('CheckJWT', () => {

  let mockResponse;
  let mw;
  let config;
  let tokenFactory;

  before(async () => {
    config = new Config('test');
    await config.load();
    tokenFactory = new TokenFactory(config);
  });

  beforeEach(() => {
    mockResponse = {
      status: (code) => {
        mockResponse.statusCode = code;
        return mockResponse;
      },
      json: (o) => {
        mockResponse.body = o;
        return mockResponse;
      }
    };
    mw = checkJwt({
      tokenFactory
    });
  });

  it('should fail due to no headers', async () => {
    const nextSpy = sinon.spy();

    await mw({}, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(401);
    expect(mockResponse.body.error.message).to.equal('No authorization header');
  });

  it('should fail due to no authorization header', async () => {
    const nextSpy = sinon.spy();
    const req = {
      headers: {
      }
    };

    await mw(req, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(401);
    expect(mockResponse.body.error.message).to.equal('No authorization header');
  });

  it('should fail due to bad authorization header', async () => {
    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: 'Bad'
      }
    };

    await mw(req, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(401);
    expect(mockResponse.body.error.message).to.equal('Malformed authorization header');
  });

  it('should fail due to invalid authorization scheme', async () => {
    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: 'Bad token'
      }
    };

    await mw(req, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(401);
    expect(mockResponse.body.error.message).to.equal('Invalid authorization scheme');
  });

  it('should fail due to JWT verify error', async () => {
    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: 'Bearer token'
      }
    };

    await mw(req, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(401);
    expect(mockResponse.body.error.message).to.equal('Could not verify token');
  });

  it('should succeed', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createRefreshToken(profile);

    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const res = {
    };

    await mw(req, res, nextSpy);

    expect(nextSpy.calledOnce).to.be.true;
    expect(nextSpy.getCall(0).args.length).to.equal(0);
    expect(req.user).to.equal('username');
  });

  it('should fail due to invalid role', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createRefreshToken(profile);

    const mw = checkJwt({ tokenFactory: tokenFactory, roles: ['admin' ] });
    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    await mw(req, mockResponse, nextSpy);

    expect(nextSpy.called).to.be.false;
    expect(mockResponse.statusCode).to.equal(403);
    expect(mockResponse.body.error.message).to.equal('Role is not authorized');
  });

  it('should succeed with role', async () => {
    const profile = {
      username: 'username',
      role: 'member'
    };
    const token = await tokenFactory.createRefreshToken(profile);

    const mw = checkJwt({ tokenFactory: tokenFactory, roles: ['member' ] });
    const nextSpy = sinon.spy();
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const res = {
    };

    await mw(req, res, nextSpy);

    expect(nextSpy.calledOnce).to.be.true;
    expect(nextSpy.getCall(0).args.length).to.equal(0);
    expect(req.user).to.equal('username');
    expect(req.role).to.exist;
  });

});
