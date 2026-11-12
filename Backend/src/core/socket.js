'use strict';

const { Server } = require('socket.io');

function createSocketServer(httpServer, { corsOrigins }) {
  return new Server(httpServer, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });
}

module.exports = { createSocketServer };
