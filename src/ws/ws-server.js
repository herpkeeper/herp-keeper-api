const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const es6BindAll = require('es6bindall');
const url = require('url');

const Logger = require('../logger/logger');

class WsServer {

  constructor(server, tokenFactory) {
    this.log = Logger.getLogger('ws:ws-server');
    this.userMap = new Map();
    this.server = server;
    this.tokenFactory = tokenFactory;
    this.started = false;
    es6BindAll(this, [
      'handleProtocolUpgrade',
      'handleConnection'
    ]);
  }

  /**
   * Send profile updated message.
   */
  sendProfileUpdated(msg) {
    this.log.debug(`Attempt to send profile updated message to ${msg.data.username}`);
    const sockets = this.userMap.get(msg.data.username);
    if (sockets) {
      sockets.forEach((s) => {
        this.log.debug(`Sending profile updated message for ${msg.data.username} to socket ${s.id}`);
        s.send(JSON.stringify({
          type: 'profile_updated',
          payload: msg.data
        }));
      });
    }
  }

  /**
   * Start web socket server.
   */
  start() {
    this.log.debug('Attempting to start web socket server');
    if (!this.started) {
      this.log.debug('Starting new web socket server');
      this.wss = new WebSocket.Server({
        clientTracking: true,
        noServer: true
      });
      this.started = true;

      // Handle protocol upgrade event
      this.server.on('upgrade', this.handleProtocolUpgrade);

      // Handle new connection
      this.wss.on('connection', this.handleConnection);
    }
  }

  /**
   * Stop web socket server.
   */
  stop() {
    this.log.debug('Attempting to stop web socket server');
    if (this.started) {
      this.wss.close();
      this.started = false;
    }
  }

  /**
   * Handle protocol upgrade.
   */
  async handleProtocolUpgrade(request, socket, head) {
    this.log.debug('Upgrade protocol event received');
    const pathname = url.parse(request.url).pathname;
    this.log.debug(`Pathname is ${pathname}`);

    if (pathname.startsWith('/ws')) {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.log.debug('Successfully upgraded protocol for web sockets');
        this.wss.emit('connection', ws, request);
      });
    } else {
      this.log.warn(`Invalid path ${pathname} for web sockets`);
      socket.destroy();
    }
  }

  /**
   * Handle connection.
   */
  handleConnection(ws, connection) {
    const connectionId = uuidv4();
    // Need to do bind all of these to socket so we can access them
    ws.id = connectionId;
    ws.log = this.log;
    ws.tokenFactory = this.tokenFactory;
    ws.setUser = this.setUser;
    ws.userMap = this.userMap;

    this.log.debug(`New web socket connection with id of ${ws.id}`);

    // Handle message
    ws.on('message', this.toEvent);

    // Handle authenticate
    ws.on('authenticate', this.authenticate);

    // Handle close
    ws.on('close', this.handleClose);
  }

  /**
   * Handle socket close.
   */
  handleClose() {
    this.log.debug(`Closing connection for ${this.username} connection id ${this.id}`);
    if (this.username) {
      this.userMap.get(this.username).delete(this.id);
    }
  }

  /**
   * Authenticate.
   */
  async authenticate(data) {
    this.log.debug('Attempting to authenticate client');

    try {
      const decoded = await this.tokenFactory.verifyAndDecodeIgnoreExpiration(data);
      const username = decoded.sub;
      this.username = username;
      this.log.debug(`Successfully authenticated user ${username} with client id ${this.id}`);
      this.setUser(username, this.id, this);
      this.send(JSON.stringify({
        type: 'authenticate',
        payload: 'Success'
      }));
    } catch (err) {
      this.log.warn(`Failed to authenticate client: ${err}`);
      this.send(JSON.stringify({
        type: 'error',
        payload: 'Failed to authenticate'
      }));
    }
  }

  /**
   * Set user in client map.
   */
  setUser(username, connectionId, socket) {
    if (this.userMap.get(username)) {
      this.userMap.get(username).set(connectionId, socket);
    } else {
      const connectionMap = new Map();
      connectionMap.set(connectionId, socket);
      this.userMap.set(username, connectionMap);
    }
  }

  /**
   * Create new event from message.
   */
  toEvent(message, ws) {
    this.log.debug(`Receieved a new message ${message}`);
    try {
      const event = JSON.parse(message);
      this.log.debug(`Received an event %o`, event);
      this.emit(event.type, event.payload);
    } catch(err) {
      this.log.warn(`Not an event ${err}`);
    }
  }

}

module.exports = WsServer;
