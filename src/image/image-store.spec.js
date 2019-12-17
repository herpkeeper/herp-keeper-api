const chai = require('chai');
const S3rver = require('s3rver');
const AWS = require('aws-sdk');
const ObjectID = require('mongodb').ObjectID;
const fs = require('fs');

const ImageStore = require('./image-store');
const Config = require('../config/config');
const S3 = require('../aws/s3');

const expect = chai.expect;
const testBucket = 'herp-keeper-test';
const fsPromises = fs.promises;

describe('ImageStore', () => {

  let s3Server;
  let imageStore;
  let profileId;
  let imageId;

  before(async function() {
    this.timeout(10000);
    s3Server = new S3rver({
      port: 10001,
      hostname: 'localhost',
      silent: false,
      directory: '/tmp/s3rver_test_directory'
    });
    await s3Server.run();
    const config = new Config('test');
    await config.load();
    const s3 = new S3(config);
    imageStore = new ImageStore(s3, config.get('aws.s3.bucket'));
    // Create test bucket and some test data
    const c = new AWS.S3({
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER',
      endpoint: 'http://localhost:10001',
      sslEnabled: false,
      s3ForcePathStyle: true
    });
    let params = {
      Bucket: testBucket
    };
    await c.createBucket(params).promise();
    profileId = new ObjectID();
    imageId = new ObjectID();
    const buf = await fsPromises.readFile('./test-data/test.jpg');
    const key = `profiles/${profileId}/images/${imageId}`;
    params = {
      Key: key,
      Bucket: testBucket,
      ContentType: 'image/jpeg',
      Body: buf
    };
    await c.upload(params).promise();
  });

  after(async () => {
    s3Server.reset();
    await s3Server.close();
  });

  it('should fail to get image', async () => {
    await expect(imageStore.get('id', 'id')).to.be.rejectedWith(/The specified key does not exist/);
  });

  it('should get image', async () => {
    const res = await imageStore.get(profileId, imageId);
    expect(res).to.exist;
    expect(res.contentLength).to.equal(3547);
    expect(res.data).to.exist;
    expect(res.lastModified).to.exist;
    expect(res.contentType).to.equal('image/jpeg');
  });

  it('should save new image', async () => {
    const buf = await fsPromises.readFile('./test-data/test.jpg');
    const res = await imageStore.save(profileId, new ObjectID(), buf);
    expect(res).to.exist;
    expect(res.contentLength).to.equal(3547);
    expect(res.data).to.exist;
    expect(res.lastModified).to.exist;
    expect(res.contentType).to.equal('image/jpeg');
  });

});
