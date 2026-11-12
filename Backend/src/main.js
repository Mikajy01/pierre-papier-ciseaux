'use strict';

const config = require('./config');
const logger = require('./shared/logger');
const { createHttp } = require('./core/http');
const { createSocketServer } = require('./core/socket');
const { InMemoryPlayerRepository } = require('./modules/player');
const { createGameModule, ServerEvents } = require('./modules/game');
const { createHealthModule } = require('./modules/health');

function bootstrap() {
  const { app, server } = createHttp(config);
  const io = createSocketServer(server, config);

  const players = new InMemoryPlayerRepository();
  const game = createGameModule({ io, app, players, settings: config.game, logger });
  createHealthModule({ app, statsProvider: game.service });

  const shutdown = (signal, message) => () => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    io.emit(ServerEvents.SERVER_SHUTDOWN, { message });
    game.stop();
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown('SIGTERM', 'Serveur en maintenance, reconnexion automatique...'));
  process.on('SIGINT', shutdown('SIGINT', 'Serveur arrêté.'));

  server.listen(config.port, config.host, () => {
    logger.info(`Server running on ${config.host}:${config.port}`);
    logger.info(`Health check: http://${config.host}:${config.port}/health`);
  });
}

bootstrap();
