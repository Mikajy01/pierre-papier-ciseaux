'use strict';

/** Socket.IO implementation of the GameNotifier port. */
function createSocketNotifier(io) {
  return {
    joinChannel: (playerId, channel) => io.sockets.sockets.get(playerId)?.join(channel),
    leaveChannel: (playerId, channel) => io.sockets.sockets.get(playerId)?.leave(channel),
    toPlayer: (playerId, event, payload) => io.to(playerId).emit(event, payload),
    toRoom: (channel, event, payload) => io.to(channel).emit(event, payload),
    toRoomExcept: (channel, exceptId, event, payload) => io.to(channel).except(exceptId).emit(event, payload),
  };
}

module.exports = { createSocketNotifier };
