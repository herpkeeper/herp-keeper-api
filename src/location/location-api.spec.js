const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('LocationApi', () => {

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
    profile = await profileCollection.create({
      username: 'user1',
      password: 'pass',
      email: 'test@test.com',
      name: 'name',
      role: 'member',
      locations: [{
        name: 'Location 1',
        geoLocation: {
          type: 'Point',
          coordinates: [1, 2]
        }
      }]
    });
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to save location due to no authorization header', async () => {
    const res = await request(app)
            .post('/api/location')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to save location due to invalid token', async () => {
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', 'Bearer bad')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to save location due to invalid role', async () => {
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to save location due to invalid request', async () => {
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(3);
  });

  it('should fail to to save new location due to profile not found', async () => {
    const newLocation = {
      name: 'New Location',
      geoLocation: {
        type: 'Point',
        coordinates: [1, 2]
      }
    };
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${badUserToken}`)
            .send(newLocation);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to save location');
  });

  it('should save new location', async () => {
    const newLocation ={
      name: 'New Location',
      geoLocation: {
        type: 'Point',
        coordinates: [1, 2]
      }
    };
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newLocation);
    expect(res.statusCode).to.equal(200);
    expect(res.body.name).to.equal('New Location');
    expect(res.body._id).to.exist;
  });

  it('should fail to update location', async () => {
    const toUpdate = {
      _id: new ObjectID(),
      name: 'Bad',
      geoLocation: {
        type: 'Point',
        coordinates: [0, 1]
      }
    };
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update location');
  });

  it('should update location', async () => {
    const toUpdate = profile.locations[0];
    toUpdate.name = 'Updated Location 1';
    toUpdate.geoLocation.coordinates = [2, 3];
    const res = await request(app)
            .post('/api/location')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(200);
    expect(res.body._id).to.equal(toUpdate._id.toHexString());
    expect(res.body.name).to.equal('Updated Location 1');
    expect(res.body.geoLocation.coordinates[0]).to.equal(2);
    expect(res.body.geoLocation.coordinates[1]).to.equal(3);
  });

  it('should fail to delete location due to no authorization header', async () => {
    const res = await request(app)
            .delete('/api/location/id');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to delete location due to invalid token', async () => {
    const res = await request(app)
            .delete('/api/location/id')
            .set('Authorization', 'Bearer bad');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to delete location due to invalid role', async () => {
    const res = await request(app)
            .delete('/api/location/id')
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to to delete location due to profile not found', async () => {
    const res = await request(app)
            .delete('/api/location/id')
            .set('Authorization', `Bearer ${badUserToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete location');
  });

  it('should fail to to delete location due to location not found', async () => {
    const id = new ObjectID().toHexString();
    const res = await request(app)
            .delete(`/api/location/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete location');
  });

  it('should delete location', async () => {
    const id = profile.locations[0]._id;
    const res = await request(app)
            .delete(`/api/location/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body._id).to.equal(id.toHexString());
  });

});
