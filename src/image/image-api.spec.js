const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;
const fs = require('fs');

const testApi = require('../test/test-api');

const expect = chai.expect;
const fsPromises = fs.promises;

describe('ImageApi', () => {

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
      images: [{
        title: 'Image 1',
        caption: 'Some caption',
        s3Key: 'key',
        contentType: 'image/png',
        fileName: 'test.png'
      }]
    });
    const imageStore = app.get('imageStore');
    const s3 = imageStore.s3;
    const config = app.get('config');
    await s3.createBucket(config.get('aws.s3.bucket'));
    const buf = await fsPromises.readFile('./test-data/test.jpg');
    await imageStore.save(profile._id, profile.images[0]._id, buf);
  });

  after(async () => {
    await testApi.tearDown();
  });

  it('should fail to save image due to no authorization header', async () => {
    const res = await request(app)
            .post('/api/image')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('No authorization header');
  });

  it('should fail to save image due to invalid token', async () => {
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', 'Bearer bad')
            .send({});
    expect(res.statusCode).to.equal(401);
    expect(res.body.error.message).to.equal('Could not verify token');
  });

  it('should fail to save image due to invalid role', async () => {
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
    expect(res.statusCode).to.equal(403);
    expect(res.body.error.message).to.equal('Role is not authorized');
  });

  it('should fail to save due to invalid request', async () => {
    const newImage = {
    };
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newImage);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(4);
  });

  it('should fail to to save new image due to profile not found', async () => {
    const buf = await fsPromises.readFile('./test-data/test.jpg');
    const newImage = {
      title: 'New Image',
      caption: 'Some caption',
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      data: buf.toString('base64')
    };
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${badUserToken}`)
            .send(newImage);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to save image');
  });

  it('should save new image', async () => {
    const buf = await fsPromises.readFile('./test-data/test.jpg');
    const newImage = {
      title: 'New Image',
      caption: 'Some caption',
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      data: buf.toString('base64')
    };
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${userToken}`)
            .send(newImage);
    expect(res.statusCode).to.equal(200);
    expect(res.body.title).to.equal('New Image');
    expect(res.body.caption).to.equal('Some caption');
    expect(res.body._id).to.exist;
    expect(res.body.fileName).to.equal('test.jpg');
    expect(res.body.contentType).to.equal('image/jpeg');
    expect(res.body.createdAt).to.exist;
    expect(res.body.updatedAt).to.exist;
  });

  it('should fail to update image', async () => {
    const toUpdate = {
      title: 'Updated Title',
      caption: 'Updated caption',
      _id: new ObjectID()
    };
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to update image');
  });

  it('should update image', async () => {
    const toUpdate = profile.images[0];
    toUpdate.title = 'Updated Title';
    toUpdate.caption = 'Updated caption';
    const res = await request(app)
            .post('/api/image')
            .set('Authorization', `Bearer ${userToken}`)
            .send(toUpdate);
    expect(res.statusCode).to.equal(200);
    expect(res.body.title).to.equal('Updated Title');
    expect(res.body.caption).to.equal('Updated caption');
    expect(res.body._id).to.exist;
    expect(res.body.fileName).to.equal('test.png');
    expect(res.body.contentType).to.equal('image/png');
    expect(res.body.createdAt).to.exist;
    expect(res.body.updatedAt).to.exist;
  });

  it('should fail to get image due to profile not found', async () => {
    const res = await request(app)
            .get('/api/image/id')
            .set('Authorization', `Bearer ${badUserToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to get image');
  });

  it('should fail to get image due to image not found', async () => {
    const id = new ObjectID().toHexString();
    const res = await request(app)
            .get(`/api/image/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to get image');
  });

  it('should get image', async () => {
    const id = profile.images[0]._id;
    const res = await request(app)
            .get(`/api/image/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.exist;
    expect(res.body.contentType).to.equal('image/jpeg');
  });

  it('should fail to to delete image due to profile not found', async () => {
    const res = await request(app)
            .delete('/api/image/id')
            .set('Authorization', `Bearer ${badUserToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete image');
  });

  it('should fail to to delete image due to image not found', async () => {
    const id = new ObjectID().toHexString();
    const res = await request(app)
            .delete(`/api/image/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(404);
    expect(res.body.error.message).to.equal('Failed to delete image');
  });

  it('should delete image', async () => {
    const id = profile.images[0]._id;
    const res = await request(app)
            .delete(`/api/image/${id}`)
            .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).to.equal(200);
    expect(res.body._id).to.equal(id.toHexString());
  });

});
