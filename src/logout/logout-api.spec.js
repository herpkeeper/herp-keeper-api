const chai = require('chai');
const request = require('supertest');

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('LogoutApi', () => {

  let app;
  let refreshToken;
  let someToken;

  before(async function() {
    this.timeout(10000);
    app = await testApi.setup();
    const tokenFactory = app.get('tokenFactory');
    someToken = await tokenFactory.createRefreshToken({
      username: 'user',
      role: 'admin'
    });
    let t = await tokenFactory.createRefreshToken({
      username: 'user',
      role: 'member'
    });
    const refreshTokenCollection = app.get('refreshTokenCollection');
    refreshToken = await refreshTokenCollection.create({
      username: 'user',
      token: t
    });
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to logout due to invalid request', async () => {
    const logoutRequest = {
    };
    const res = await request(app)
          .post('/api/logout')
          .send(logoutRequest);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(2);
  });

  it('should fail to logout due to invalid JWT', async () => {
    const logoutRequest = {
      username: 'bad',
      refreshToken: 'bad'
    };
    const res = await request(app)
      .post('/api/logout')
      .send(logoutRequest);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to logout');
  });

  it('should fail to logout due to token not found', async () => {
    const logoutRequest = {
      username: 'user',
      refreshToken: someToken
    };
    const res = await request(app)
            .post('/api/logout')
            .send(logoutRequest);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to logout');
  });

  it('should logout', async () => {
    const logoutRequest = {
      username: refreshToken.username,
      refreshToken: refreshToken.token
    };
    let res = await request(app)
          .post('/api/logout')
          .send(logoutRequest);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.result).to.be.true;
  });

});
