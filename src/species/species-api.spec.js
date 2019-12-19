const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe.only('SpeciesApi', () => {

  let app;
  let adminToken;
  let userToken;
  let badUserToken;
  let profile;

  before(async function() {
    this.timeout(10000);
    app = await testApi.setup();
    const tokenFactory = app.get('tokenFactory');
    adminToken = await tokenFactory.createAccessToken({
      username: 'admin',
      role: 'admin'
    });
    userToken = await tokenFactory.createAccessToken({
      username: 'user1',
      role: 'member'
    });
    badUserToken = await tokenFactory.createAccessToken({
      username: 'bad',
      role: 'member'
    });
    const profileCollection = app.get('profileCollection');
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to save species due to no authorization header', async () => {
    const res = await request(app)
            .post('/api/species')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

});
