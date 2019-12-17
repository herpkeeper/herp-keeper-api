const chai = require('chai');
const S3rver = require('s3rver');
const AWS = require('aws-sdk');

const S3 = require('./s3');
const Config = require('../config/config');

const expect = chai.expect;
const testBucket = 'test-bucket';

describe('S3', () => {

  let s3;
  let s3Server;

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
    s3 = new S3(config);
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
    const buf = Buffer.from('test');
    params = {
      Bucket: testBucket,
      Key: 'file-1.txt',
      Body: buf
    };
    await c.upload(params).promise();
    params.Key = 'file-2.txt';
    await c.upload(params).promise();
    params.Key = 'test-folder/file-3.txt';
    await c.upload(params).promise();
    params.Key = 'test-folder/file-4.txt';
    await c.upload(params).promise();
  });

  after(async () => {
    s3Server.reset();
    await s3Server.close();
  });

  it('should create new bucket', async () => {
    let res = await s3.createBucket('new-bucket');
    expect(res).to.be.true;
    res = await s3.createBucket('new-bucket');
    expect(res).to.be.false;
  });

  it('should list objects', async () => {
    const res = await s3.listObjects(testBucket);
    expect(res.length).to.equal(4);
    expect(res[0].Key).to.equal('file-1.txt');
    expect(res[1].Key).to.equal('file-2.txt');
    expect(res[2].Key).to.equal('test-folder/file-3.txt');
    expect(res[3].Key).to.equal('test-folder/file-4.txt');
  });

  it('should list objects with prefix', async () => {
    const res = await s3.listObjects(testBucket, 'test-folder');
    expect(res.length).to.equal(2);
    expect(res[0].Key).to.equal('test-folder/file-3.txt');
    expect(res[1].Key).to.equal('test-folder/file-4.txt');
  });

  it('should get object', async () => {
    const res = await s3.getObject(testBucket, 'test-folder/file-3.txt');
    expect(res.ContentLength).to.equal(4);
  });

  it('should save then delete object', async () => {
    const buf = Buffer.from('test');
    const key = 'file-5.txt';
    let res = await s3.saveObject(testBucket, key, buf);
    expect(res.Key).to.equal('file-5.txt');
    res = await s3.listObjects(testBucket);
    expect(res.length).to.equal(5);
    res = await s3.deleteObject(testBucket, key);
    expect(res).to.be.true;
    res = await s3.listObjects(testBucket);
    expect(res.length).to.equal(4);
  });

  it('should fail to delete object that does not exist', async () => {
    const res = await s3.deleteObject(testBucket, 'bad.txt');
    expect(res).to.be.false;
  });

  it('should save and set content type', async () => {
    const fs = require('fs');
    const fsPromises = fs.promises;
    const data = await fsPromises.readFile('./test-data/test.jpg');
    const key = 'test.jpg';
    let res = await s3.saveObject(testBucket, key, data);
    expect(res.Key).to.equal('test.jpg');
    res = await s3.getObject(testBucket, key);
    expect(res).to.exist;
    expect(res.ContentType).to.equal('image/jpeg');
  });

});
