const Logger = require('../logger/logger');

class ImageStore {

  constructor(s3, bucket) {
    this.log = Logger.getLogger('image:image-store');
    this.s3 = s3;
    this.bucket = bucket;
  }

  getKey(profileId, imageId) {
    const key = `profiles/${profileId}/images/${imageId}`;
    this.log.debug(`Image store key is ${key}`);
    return key;
  }

  async get(profileId, imageId) {
    this.log.debug(`Attempt to get image ${imageId} for profile ${profileId}`);
    const key = this.getKey(profileId, imageId);
    const object = await this.s3.getObject(this.bucket, key);
    const res = {
      lastModified: object.LastModified,
      contentLength: object.ContentLength,
      contentType: object.ContentType,
      data: object.Body.toString('base64')
    };
    return res;
  }

  async save(profileId, imageId, data) {
    this.log.debug(`Attempt to save image ${imageId} for profile ${profileId}`);
    const key = this.getKey(profileId, imageId);
    const added = await this.s3.saveObject(this.bucket, key, data);
    const object = await this.s3.getObject(this.bucket, key);
    const res = {
      lastModified: object.LastModified,
      contentLength: object.ContentLength,
      contentType: object.ContentType,
      data: object.Body.toString('base64')
    };
    return res;
  }

  async remove(profileId, imageId) {
    this.log.debug(`Attempt to delete image ${imageId} for profile ${profileId}`);
    const key = this.getKey(profileId, imageId);
    const deleted = await this.s3.deleteObject(this.bucket, key);
    return deleted;
  }

}

module.exports = ImageStore;
