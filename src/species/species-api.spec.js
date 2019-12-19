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
    profile = await profileCollection.create({
      username: 'user1',
      password: 'pass',
      email: 'test@test.com',
      name: 'name',
      role: 'member',
      species: [{
        commonName: 'Common Name'
      }]
    });
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

  it('should fail to save species due to invalid token', async () => {
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', 'Bearer bad')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to save species due to invalid role', async () => {
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to save new species due to invalid request', async () => {
    const newSpecies = {
    };
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newSpecies);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(1);
  });

  it('should fail to to save new species due to profile not found', async () => {
    const newSpecies = {
      commonName: 'New Species'
    };
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', `Bearer ${badUserToken}`)
            .send(newSpecies);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to save species');
  });

  it('should save new species', async () => {
    const newSpecies = {
      commonName: 'New Species'
    };
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newSpecies);
    expect(res.statusCode).to.equal(200);
    expect(res.body.commonName).to.equal('New Species');
    expect(res.body._id).to.exist;
  });

  it('should fail to update species', async () => {
    const toUpdate = {
      _id: new ObjectID(),
      commonName: 'Bad Name'
    };
    const res = await request(app)
            .post('/api/species')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update species');
  });

});
