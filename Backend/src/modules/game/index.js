'use strict';

const { GameService } = require('./application/game.service');
const { InMemoryRoomRepository } = require('./infrastructure/in-memory-room.repository');
const { generateOtp } = require('./infrastructure/otp.generator');
const { createSocketNotifier } = require('./interfaces/socket-notifier');
const { registerGameGateway } = require('./interfaces/game.gateway');
const { createGameRouter } = require('./interfaces/game.routes');
const { ServerEvents } = require('./interfaces/events');

/**
 * Wires the game module: repositories, service, Socket.IO gateway and HTTP routes.
 */
function createGameModule({ io, app, players, settings, logger }) {
  const service = new GameService({
    rooms: new InMemoryRoomRepository(),
    players,
    notifier: createSocketNotifier(io),
    generateOtp,
    settings,
    logger,
  });

  registerGameGateway(io, service, logger);
  app.use(createGameRouter(service));

  const timer = setInterval(() => service.cleanup(), settings.cleanupIntervalMs);
  timer.unref();

  return { service, stop: () => clearInterval(timer) };
}

module.exports = { createGameModule, ServerEvents };
