const mongoose = require('mongoose');
require('mongoose-type-email');
const bcrypt = require('bcryptjs');

const Email = mongoose.SchemaTypes.Email;
const ObjectId = mongoose.SchemaTypes.ObjectId;

const Logger = require('../logger/logger');

const log = Logger.getLogger('profile:profile-schema');

async function postProfileUpdatedMessage(profile, publisher) {
  if (publisher) {
    log.debug(`Attempt to post profile updated message for ${profile.username}`);
    const message = {
      type: 'profile_updated',
      message: `Profile ${profile._id} for user ${profile.username} has been updated`,
      data: {
        profileId: profile._id,
        username: profile.username,
        timestamp: new Date()
      }
    }
    await publisher.publish(message);
  }
}

const profileSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: Email,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: false
  },
  activationKey: {
    type: String
  },
  foodTypes: [String]
}, { timestamps: true });

profileSchema.pre('save', async function() {
  if (this.isModified('password')) {
    log.debug('Password has been modified, hash it');
    this.password = bcrypt.hashSync(this.password, 10);
  }
});

profileSchema.post('save', async function() {
  await postProfileUpdatedMessage(this, profileSchema.publisher);
});

module.exports = profileSchema;
