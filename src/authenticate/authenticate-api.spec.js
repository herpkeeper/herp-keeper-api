const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('AuthentiateApi', () => {

  let app;

  before(async function() {
    this.timeout(10000);
    app = await testApi.setup();
    const profileCollection = app.get('profileCollection');
    const profile1 = {
      username: 'activeuser',
      email: 'test@test.com',
      name: 'Name',
      password: 'goodpassword',
      role: 'member',
      active: true
    };
    await profileCollection.create(profile1);
    const profile2 = {
      username: 'inactiveuser',
      email: 'test2@test.com',
      name: 'Name',
      password: 'goodpassword',
      role: 'member',
      active: false
    };
    await profileCollection.create(profile2);
  });

  after(async function() {
    await testApi.tearDown();
  });

  it('should fail to authenticate due to invalid request', async () => {
    const credentials = {
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(2);
  });

  it('should fail to authenticate due to invalid user', async () => {
    const credentials = {
      username: 'baduser',
      password: 'badpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should fail to authenticate due to invalid password', async () => {
    const credentials = {
      username: 'activeuser',
      password: 'badpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should fail to authenticate due to inactive', async () => {
    const credentials = {
      username: 'inactiveuser',
      password: 'goodpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(403);
    expect(res.body).to.exist;
    expect(res.body.error).to.exist;
    expect(res.body.error.message).to.equal('Failed to authenticate');
  });

  it('should authenticate', async () => {
    const credentials = {
      username: 'activeuser',
      password: 'goodpassword'
    };
    const res = await request(app)
            .post('/api/authenticate')
            .send(credentials);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body._id).to.exist;
    expect(res.body.username).to.equal('activeuser');
    expect(res.body.email).to.equal('test@test.com');
    expect(res.body.name).to.equal('Name');
    expect(res.body.role).to.equal('member');
    expect(res.body.createdAt).to.exist;
    expect(res.body.refreshToken).to.exist;
    expect(res.body.accessToken).to.exist;
    expect(res.body.accessExpires).to.equal(300);
  });

});
