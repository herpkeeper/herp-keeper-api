const AWS = require('aws-sdk');
const fileType = require('file-type');

const Logger = require('../logger/logger');

class S3 {

  constructor(config) {
    this.log = Logger.getLogger('aws:s3');
    this.config = config;
    this.region = 'us-east-1';
  }

  getClient() {
    this.log.debug('Getting S3 client');
    if (!this.client) {
      this.log.debug('No existing S3 client found, create new one');
      this.client = new AWS.S3({
        accessKeyId: this.config.get('aws.s3.id'),
        secretAccessKey: this.config.get('aws.s3.key'),
        sslEnabled: this.config.get('aws.s3.ssl'),
        s3ForcePathStyle: this.config.get('aws.s3.forcePathStyle'),
        endpoint: this.config.get('aws.s3.endpoint')
      });
    }
    return this.client;
  }

  async bucketExists(bucketName) {
    this.log.debug(`Checking to see if S3 bucket ${bucketName} exists`);
    const s3 = await this.getClient();
    try {
      const params = {
        Bucket: bucketName
      };
      const res = await s3.headBucket(params).promise();
      return true;
    } catch (err) {
      return false;
    }
  }

  async objectExists(bucketName, key) {
    this.log.debug(`Checking to see if S3 object with key ${key} exists in bucket ${bucketName}`);
    const s3 = await this.getClient();
    try {
      const params = {
        Bucket: bucketName,
        Key: key
      };
      const res = await s3.headObject(params).promise();
      return true;
    } catch (err) {
      return false;
    }
  }

  async createBucket(bucketName) {
    this.log.debug(`Attempt to create S3 bucket ${bucketName}`);
    const s3 = this.getClient();
    const exists = await this.bucketExists(bucketName);
    if (exists) {
      this.log.warn(`S3 bucket ${bucketName} already exists`);
      return false;
    } else {
      const params = {
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: this.region
        }
      };
      const res = await s3.createBucket(params).promise();
      return true;
    }
  }

  async saveObject(bucketName, key, data) {
    this.log.debug(`Save S3 object with key of ${key} to bucket ${bucketName}`);
    const s3 = await this.getClient();
    // Get content type
    const contentType = fileType(data);
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: data
    };
    if (contentType) {
      this.log.debug(`Content type is ${contentType.mime}`);
      params.ContentType = contentType.mime;
    }
    const res = await s3.upload(params).promise();
    return res;
  }

  async deleteObject(bucketName, key) {
    this.log.debug(`Delete S3 object with key of ${key} from bucket ${bucketName}`);
    const s3 = await this.getClient();
    const exists = await this.objectExists(bucketName, key);
    if (exists) {
      const params = {
        Bucket: bucketName,
        Key: key
      };
      const res = await s3.deleteObject(params).promise();
      return true;
    } else {
      this.log.warn('S3 Object does not exist');
      return false;
    }
  }

  async listObjects(bucketName, prefix) {
    this.log.debug(`Listing S3 objects in bucket ${bucketName} with prefix ${prefix}`);
    const s3 = await this.getClient();
    const params = {
      Bucket: bucketName
    };
    if (prefix) {
      params.Prefix = prefix
    }
    const res = await s3.listObjects(params).promise();
    return res.Contents;
  }

  async getObject(bucketName, key) {
    this.log.debug(`Getting S3 object with key of ${key} from bucket ${bucketName}`);
    const s3 = await this.getClient();
    const params = {
      Bucket: bucketName,
      Key: key
    };
    const res = await s3.getObject(params).promise();
    return res;
  }

}

module.exports = S3;
