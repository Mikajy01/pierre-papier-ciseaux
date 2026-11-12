'use strict';

const { Player } = require('../../player');
const { ClientEvents: C, ServerEvents: S } = require('./events');

/** Binds Socket.IO client events to GameService use cases. */
function registerGameGateway(io, gameService, logger) {
  io.on('connection', (socket) => {
    const playerId = socket.id;
    logger.info(`Client connected: ${playerId}`);
    gameService.connect(new Player(playerId));

    const on = (event, handler) =>
      socket.on(event, (payload = {}) => {
        gameService.touch(playerId);
        try {
          handler(payload);
        } catch (err) {
          logger.error(`Handler "${event}" failed for ${playerId}:`, err);
        }
      });

    on(C.CREATE_GAME, () => gameService.createGame(playerId));
    on(C.JOIN_GAME, ({ otp }) => gameService.joinGame(playerId, String(otp ?? '')));
    on(C.MAKE_CHOICE, ({ roomId, choice }) => gameService.makeChoice(playerId, roomId, choice));
    on(C.PLAY_AGAIN, ({ roomId }) => gameService.playAgain(playerId, roomId));
    on(C.LEAVE_GAME, ({ roomId }) => gameService.leaveGame(playerId, roomId));
    on(C.PING, () => socket.emit(S.PONG));

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${playerId} (${reason})`);
      gameService.disconnect(playerId);
    });

    socket.emit(S.CONNECTED, { playerId, timestamp: Date.now() });
  });
}

module.exports = { registerGameGateway };
