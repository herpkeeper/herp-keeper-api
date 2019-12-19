const { checkSchema, validationResult } = require('express-validator');
const es6BindAll = require('es6bindall');

const checkJwt = require('../middleware/check-jwt');
const Logger = require('../logger/logger');

const checkSpecies = checkSchema({
  _id: {
    optional: { options: { nullable: true } },
    isMongoId: true
  },
  commonName: {
    isLength: {
      options: { min: 1 }
    }
  },
  class: {
    optional: { options: { nullable: true } }
  },
  order: {
    optional: { options: { nullable: true } }
  },
  subOrder: {
    optional: { options: { nullable: true } }
  },
  genus: {
    optional: { options: { nullable: true } }
  },
  species: {
    optional: { options: { nullable: true } }
  },
  venomous: {
    isBoolean: true,
    optional: { options: { nullable: true } }
  },
  potentiallyHarmful: {
    isBoolean: true,
    optional: { options: { nullable: true } }
  },
  imageId: {
    optional: { options: { nullable: true } },
    isMongoId: true
  }
});

class SpeciesApi {

  constructor(router, tokenFactory) {
    this.log = Logger.getLogger('species:species-api');
    this.router = router;
    this.tokenFactory = tokenFactory;
    es6BindAll(this, [
      'save'
    ]);

    this.router.post('/species', checkJwt({ tokenFactory, roles: ['member'] }), checkSpecies, this.save);
  }

  async save(req, res) {
  }

}

module.exports = SpeciesApi;
