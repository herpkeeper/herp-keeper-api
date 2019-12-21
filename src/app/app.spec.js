const chai = require('chai');

const App = require('./app');
const Config = require('../config/config');

const expect = chai.expect;

describe('App', () => {

  it('should fail to create until everything is set', () => {
    expect(() => new App()).to.throw(/Config is not set/);
    expect(() => new App({})).to.throw(/Token factory is not set/);
    expect(() => new App({}, {})).to.throw(/Mailer is not set/);
    expect(() => new App({}, {}, {})).to.throw(/Image store is not set/);
    expect(() => new App({}, {}, {}, {}, {
    })).to.throw(/Collections not properly setup/);
    expect(() => new App({}, {}, {}, {}, {
      profileCollection: {}
    })).to.throw(/Collections not properly setup/);
    expect(() => new App({}, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {}
    })).to.throw(/Collections not properly setup/);
    expect(() => new App({}, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {},
      locationCollection: {}
    })).to.throw(/Collections not properly setup/);
    expect(() => new App({}, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {},
      locationCollection: {},
      imageCollection: {}
    })).to.throw(/Collections not properly setup/);
    expect(() => new App({}, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {},
      locationCollection: {},
      imageCollection: {},
      speciesCollection: {}
    })).to.throw(/Collections not properly setup/);
    expect(new App({}, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {},
      locationCollection: {},
      imageCollection: {},
      speciesCollection: {},
      animalCollection: {}
    })).to.exist;
  });

  it('should listen and close', async () => {
    const config = new Config('test');
    config.set('app.port', 8888);
    const app = new App(config, {}, {}, {}, {
      profileCollection: {},
      refreshTokenCollection: {},
      locationCollection: {},
      imageCollection: {},
      speciesCollection: {},
      animalCollection: {}
    });
    expect(app.app).to.exist;
    const server = await app.listen();
    await server.close();
  });

});
