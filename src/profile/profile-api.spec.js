const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('ProfileApi', () => {

  let app;
  let adminToken;
  let userToken;
  let user2Token;
  let badUserToken;
  let profile1;
  let profile2;
  let profile3;
  let profile4;

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
    user2Token = await tokenFactory.createAccessToken({
      username: 'user2',
      role: 'member'
    });
    badUserToken = await tokenFactory.createAccessToken({
      username: 'bad',
      role: 'member'
    });
    const profileCollection = app.get('profileCollection');
    const _profile1 = {
      username: 'user1',
      email: 'test1@test.com',
      name: 'Name',
      password: 'password',
      role: 'member',
      active: true
    };
    profile1 = await profileCollection.create(_profile1);
    const _profile2 = {
      username: 'user2',
      email: 'test2@test.com',
      name: 'Name',
      password: 'password',
      role: 'member',
      active: true
    };
    profile2 = await profileCollection.create(_profile2);
    const _profile3 = {
      username: 'user3',
      email: 'test3@test.com',
      name: 'Name',
      password: 'password',
      role: 'member',
      active: true
    };
    profile3 = await profileCollection.create(_profile3);
    const _profile4 = {
      username: 'user4',
      email: 'test4@test.com',
      name: 'Name',
      password: 'password',
      role: 'member',
      active: true
    };
    profile4 = await profileCollection.create(_profile4);
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to get count due to no authorization header', async () => {
    const res = await request(app)
            .get('/api/profile/count');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to get count due to invalid token', async () => {
    const res = await request(app)
            .get('/api/profile/count')
            .set('Authorization', 'Bearer bad');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to get count due to invalid role', async () => {
    const res = await request(app)
            .get('/api/profile/count')
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should get total count', async () => {
    const res = await request(app)
            .get('/api/profile/count')
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.count).to.equal(4);
  });

  it('should get count with query', async () => {
    const res = await request(app)
            .get('/api/profile/count')
            .query({ username: 'user1' })
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.count).to.equal(1);
  });

  it('should fail to find due to no authorization header', async () => {
    const res = await request(app)
            .get('/api/profile');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to find due to invalid token', async () => {
    const res = await request(app)
            .get('/api/profile')
            .set('Authorization', 'Bearer bad');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to find due to invalid role', async () => {
    const res = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should find all', async () => {
    const res = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.length).to.equal(4);
  });

  it('should find with query', async () => {
    const res = await request(app)
            .get('/api/profile')
            .query({ username: 'user1' })
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.length).to.equal(1);
  });

  it('should find with skip and limit', async () => {
    const res = await request(app)
            .get('/api/profile')
            .query({ skip: 1, limit: 2 })
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.length).to.equal(2);
  });

  it('should fail to get due to no authorization header', async () => {
    const res = await request(app)
            .get('/api/profile/id');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to get due to invalid token', async () => {
    const res = await request(app)
            .get('/api/profile/id')
            .set('Authorization', 'Bearer bad');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should get as admin', async () => {
    const res = await request(app)
            .get(`/api/profile/${profile1._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.username).to.equal(profile1.username);
  });

  it('should fail to get as user', async () => {
    const res = await request(app)
            .get(`/api/profile/${profile2._id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Access to this profile is forbidden');
  });

  it('should get as user', async () => {
    const res = await request(app)
            .get(`/api/profile/${profile1._id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.username).to.equal(profile1.username);
    expect(res.body.password).to.not.exist;
  });

  it('should fail to update to no authorization header', async () => {
    const toUpdate = profile1;
    const res = await request(app)
            .post('/api/profile/')
            .send(toUpdate);
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to upate to invalid request', async () => {
    const toUpdate = {
      _id: 'id'
    };
    const res = await request(app)
            .post('/api/profile/')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(1);
  });

  it('should fail to update due to profile not found', async () => {
    const toUpdate = profile1;
    const res = await request(app)
            .post('/api/profile/')
            .send(toUpdate)
            .set('Authorization', `Bearer ${badUserToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update profile');
  });

  it('should fail to update due to forbidden', async () => {
    const toUpdate = profile1;
    const res = await request(app)
            .post('/api/profile/')
            .send(toUpdate)
            .set('Authorization', `Bearer ${user2Token}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Access to this profile is forbidden');
  });

  it('should update profile', async () => {
    const toUpdate = profile1;
    toUpdate.name = 'Updated Name';
    toUpdate.email = 'updated@test.com';
    toUpdate.password = 'updatedpassword';
    toUpdate.foodTypes = [ 'type1', 'type2' ];
    const res = await request(app)
            .post('/api/profile/')
            .send(toUpdate)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.exist;
    expect(res.body.name).to.equal('Updated Name');
    expect(res.body.password).to.not.exist;
    expect(res.body.email).to.equal('updated@test.com');
    expect(res.body.foodTypes.length).to.equal(2);
  });

});
