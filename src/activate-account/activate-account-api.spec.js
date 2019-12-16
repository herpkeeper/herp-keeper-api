const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('ActivateAccountApi', () => {

  let app;
  let profile;

  before(async function() {
    this.timeout(10000);
    app = await testApi.setup();
    const profileCollection = app.get('profileCollection');
    profile = await profileCollection.create({
      username: 'user1',
      email: 'user1@herp-keeper.com',
      name: 'User 1',
      password: 'testpassword',
      role: 'member',
      activationKey: 'goodkey',
      active: false
    });
  });

  after(async function() {
    await testApi.tearDown();
  });

  it('should fail to activate account due to invalid request', async () => {
    const res = await request(app)
      .get('/api/activate-account');
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(2);
  });

  it('should fail to activate account due to profile not found', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'notfound', key: 'notfound' });
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to activate account');
  });

  it('should fail to activate account due to bad key', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'user1', key: 'badkey' });
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to activate account');
  });

  it('should activate account', async () => {
    const res = await request(app)
            .get('/api/activate-account')
            .query({ username: 'user1', key: 'goodkey' });
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.username).to.equal(profile.username);
    expect(res.body.name).to.equal(profile.name);
    expect(res.body.email).to.equal(profile.email);
  });

});
