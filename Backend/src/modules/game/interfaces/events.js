'use strict';

/** Socket.IO contract shared with the frontend. Do not rename without updating the client. */
const ClientEvents = Object.freeze({
  CREATE_GAME: 'createGame',
  JOIN_GAME: 'joinGame',
  MAKE_CHOICE: 'makeChoice',
  PLAY_AGAIN: 'playAgain',
  LEAVE_GAME: 'leaveGame',
  PING: 'ping',
});

const ServerEvents = Object.freeze({
  CONNECTED: 'connected',
  GAME_CREATED: 'gameCreated',
  GAME_JOINED: 'gameJoined',
  GAME_READY: 'gameReady',
  START_GAME: 'startGame',
  OPPONENT_CHOICE_MADE: 'opponentChoiceMade',
  START_COUNTDOWN: 'startCountdown',
  REVEAL_CHOICES: 'revealChoices',
  NEW_ROUND: 'newRound',
  INVALID_OTP: 'invalidOTP',
  ROOM_FULL: 'roomFull',
  OPPONENT_DISCONNECTED: 'opponentDisconnected',
  SERVER_SHUTDOWN: 'serverShutdown',
  PONG: 'pong',
});

module.exports = { ClientEvents, ServerEvents };
