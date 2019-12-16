const chai = require('chai');
const request = require('supertest');
const ObjectID = require('mongodb').ObjectID;

const testApi = require('../test/test-api');

const expect = chai.expect;

describe('RegisterApi', () => {

  let app;

  before(async function() {
    this.timeout(10000);
    app = await testApi.setup();
  });

  after(async function() {
    await testApi.tearDown();
  });

  it('should fail to register due to invalid request', async () => {
    const registration = {
    };
    const res = await request(app)
            .post('/api/register')
            .send(registration);
    expect(res.statusCode).to.equal(422);
    expect(res.body.errors).to.exist;
    expect(res.body.errors.length).to.equal(4);
  });

  it('should register', async () => {
    const registration = {
      username: 'newuser',
      password: 'testpass',
      email: 'newuser@herp-keeper.com',
      name: 'New User'
    };
    const res = await request(app)
            .post('/api/register')
            .send(registration);
    expect(res.statusCode).to.equal(200);
  });

});
