const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('AnimalApi', () => {

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
    const locationId = new ObjectID();
    const speciesId = new ObjectID();
    const animalId = new ObjectID();
    profile = await profileCollection.create({
      username: 'user1',
      password: 'pass',
      email: 'test@test.com',
      name: 'name',
      role: 'member',
      locations: [{
        _id: locationId,
        name: 'Location 1',
        geoLocation: {
          type: 'Point',
          coordinates: [0, 1]
        }
      }],
      species: [{
        _id: speciesId,
        commonName: 'Species 1'
      }],
      animals: [{
        name: 'Animal 1',
        speciesId: speciesId,
        locationId: locationId
      }, {
        name: 'Animal 2',
        speciesId: speciesId,
        locationId: locationId
      }]
    });
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to save animal due to no authorization header', async () => {
    const res = await request(app)
            .post('/api/animal')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to save animal due to invalid token', async () => {
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', 'Bearer bad')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to save species due to invalid role', async () => {
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to to save new animal due to invalid request', async () => {
    const newAnimal = {
    };
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newAnimal);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(3);
  });

  it('should fail to to save new animal due to profile not found', async () => {
    const newAnimal = {
      name: 'New Animal',
      locationId: new ObjectID(),
      speciesId: new ObjectID()
    };
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${badUserToken}`)
            .send(newAnimal);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to save animal');
  });

  it('should save new animal', async () => {
    const newAnimal = {
      name: 'New Animal',
      locationId: profile.locations[0]._id,
      speciesId: profile.species[0]._id,
      birthDate: new Date(),
      acquisitionDate: new Date(),
      images: [{
        imageId: new ObjectID(),
        default: true
      }, {
        imageId: new ObjectID(),
        default: false
      }],
      feedings: [{
        type: 'Pinky mouse',
        quantity: 1,
        feedingDate: new Date()
      }, {
        type: 'Large rat',
        quantity: 1,
        feedingDate: new Date()
      }]
    };
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newAnimal);
    expect(res.statusCode).to.equal(200);
    expect(res.body.name).to.equal('New Animal');
    expect(res.body._id).to.exist;
  });

  it('should fail to update animal', async () => {
    const toUpdate = {
      _id: new ObjectID(),
      name: 'Bad Animal',
      locationId: profile.locations[0]._id,
      speciesId: profile.species[0]._id
    };
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update animal');
  });

  it('should update animal', async () => {
    const toUpdate = profile.animals[0];
    toUpdate.name = 'Updated Name';
    const res = await request(app)
            .post('/api/animal')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(200);
    expect(res.body.name).to.equal('Updated Name');
    expect(res.body._id).to.equal(profile.animals[0]._id.toHexString());
  });

  it('should fail to save animals due to no authorization header', async () => {
    const res = await request(app)
            .post('/api/animals')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to update animals due invalid array size', async () => {
    const toUpdate = [];
    const res = await request(app)
            .post('/api/animals')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(1);
  });

  it('should fail to update animals due to invalid request', async () => {
    const toUpdate = [{
    }, {
    }];
    const res = await request(app)
            .post('/api/animals')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(6);
  });

  it('should fail to update animals due to profile not found', async () => {
    const toUpdate = [ profile.animals[0], profile.animals[1] ];
    const res = await request(app)
            .post('/api/animals')
            .set('Authorization', `Bearer ${badUserToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to save animals');
  });

  it('should fail to update animals',  async () => {
    const toUpdate = [ profile.animals[0], { _id: new ObjectID(), name: 'Name', locationId: new ObjectID(), speciesId: new ObjectID() }];
    const res = await request(app)
            .post('/api/animals')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update animals');
  });

  it('should update animals', async () => {
    const toUpdate1 = profile.animals[0];
    toUpdate1.name = 'Updated name again';
    const toUpdate2 = profile.animals[1];
    toUpdate2.feedings = [{
      feedingDate: new Date(),
      type: 'type',
      quantity: 1
    }, {
      feedingDate: new Date(),
      type: 'type',
      quantity: 1
    }];
    const toUpdate = [ toUpdate1, toUpdate2 ];
    const res = await request(app)
            .post('/api/animals')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(200);
    expect(res.body.length).to.equal(3);
  });

  it('should fail to delete animal due to no authorization header', async () => {
    const res = await request(app)
            .delete('/api/animal/id');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to delete animal due to invalid token', async () => {
    const res = await request(app)
            .delete('/api/animal/id')
            .set('Authorization', 'Bearer bad');
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to delete animal due to invalid role', async () => {
    const res = await request(app)
            .delete('/api/animal/id')
            .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to to delete animal due to profile not found', async () => {
    const res = await request(app)
            .delete('/api/animal/id')
            .set('Authorization', `Bearer ${badUserToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete animal');
  });

  it('should fail to to delete animal due to animal not found', async () => {
    const id = new ObjectID().toHexString();
    const res = await request(app)
            .delete(`/api/animal/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete animal');
  });

  it('should delete animal', async () => {
    const id = profile.animals[0]._id;
    const res = await request(app)
            .delete(`/api/animal/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body._id).to.equal(id.toHexString());
  });

});
