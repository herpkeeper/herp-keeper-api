const chai = require('chai');
const express = require('express');
const WebSocket = require('ws');
const Config = require('../config/config');
const TokenFactory = require('../token/token-factory');

const WsServer = require('./ws-server');

const expect = chai.expect;

describe('WsServer', () => {

  let app;
  let server;
  let wsServer;
  let userToken;
  const wsUrl = 'ws://localhost:8888/ws';

  before(async () => {
    app = express();
    server = await app.listen(8888);
    const config = new Config('test');
    await config.load();
    const tokenFactory = new TokenFactory(config);
    userToken = await tokenFactory.createAccessToken({
      username: 'user1',
      role: 'member'
    });
    wsServer = new WsServer(server, tokenFactory);
  });

  after(() => {
    wsServer.stop();
    server.close();
  });

  it('should not fail to stop if not started', () => {
    expect(wsServer.started).to.be.false;
    wsServer.stop();
    expect(wsServer.started).to.be.false;
  });

  it('should start', () => {
    expect(wsServer.started).to.be.false;
    wsServer.start();
    expect(wsServer.wss).to.exist;
    expect(wsServer.started).to.be.true;
    wsServer.start();
    expect(wsServer.wss).to.exist;
    expect(wsServer.started).to.be.true;
  });

  it('should fail to connect', (done) => {
    const socket = new WebSocket('ws://localhost:8888');
    expect(socket).to.exist;
    socket.on('error', (err) => {
      expect(err).to.exist;
      done();
    });
  });

  it('should connect', (done) => {
    const socket = new WebSocket(wsUrl);
    expect(socket).to.exist;
    socket.on('open', () => {
      socket.on('close', () => {
        done();
      });
      socket.close();
    });
  });

  it('should ignore not-event', (done) => {
    const socket = new WebSocket(wsUrl);
    expect(socket).to.exist;
    socket.on('open', () => {
      socket.send('bad');
      socket.on('close', () => {
        done();
      });
      socket.close();
    });
  });

  it('should fail to authenticate', (done) => {
    const socket = new WebSocket(wsUrl);
    expect(socket).to.exist;
    socket.on('open', () => {
      const msg = {
        type: 'authenticate',
        payload: 'bad'
      };
      socket.send(JSON.stringify(msg));
      socket.on('message', (data) => {
        const o = JSON.parse(data);
        expect(o.type).to.equal('error');
        expect(o.payload).to.equal('Failed to authenticate');
        socket.close();
      });
      socket.on('close', () => {
        done();
      });
    });
  });

  it('should authenticate twice', (done) => {
    const socket = new WebSocket(wsUrl);
    expect(socket).to.exist;
    socket.on('open', () => {
      const msg = {
        type: 'authenticate',
        payload: userToken
      };
      socket.send(JSON.stringify(msg));
      socket.on('message', (data) => {
        let o = JSON.parse(data);
        expect(o.type).to.equal('authenticate');
        expect(o.payload).to.equal('Success');
        expect(wsServer.userMap.size).to.equal(1);
        expect(wsServer.userMap.get('user1').size).to.equal(1);
        const socket2 = new WebSocket(wsUrl);
        expect(socket2).to.exist;
        socket2.on('open', () => {
          socket2.send(JSON.stringify(msg));
          socket2.on('message', (data) => {
            expect(o.type).to.equal('authenticate');
            expect(o.payload).to.equal('Success');
            expect(wsServer.userMap.size).to.equal(1);
            expect(wsServer.userMap.get('user1').size).to.equal(2);
            socket.close();
            socket.on('close', () => {
              socket2.close();
              socket2.on('close', () => {
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should not send profile updated', () => {
    wsServer.sendProfileUpdated({
      data: {
        username: 'username'
      }
    });
  });

  it('should send profile updated', (done) => {
    const socket = new WebSocket(wsUrl);
    expect(socket).to.exist;
    socket.on('open', () => {
      const msg = {
        type: 'authenticate',
        payload: userToken
      };
      socket.send(JSON.stringify(msg));
      socket.on('message', (data) => {
        let o = JSON.parse(data);
        expect(o.type).to.exist;
        if (o.type === 'authenticate') {
          wsServer.sendProfileUpdated({
            data: {
              username: 'user1'
            }
          });
        } else if (o.type === 'profile_updated') {
          expect(o.payload.username).to.equal('user1');
          socket.close();
          socket.on('close', () => {
            done();
          });
        }
      });
    });
  });

});
