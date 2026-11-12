/** Socket.IO contract — mirrors Backend/src/modules/game/interfaces/events.js */
export const ClientEvents = {
  CREATE_GAME: 'createGame',
  JOIN_GAME: 'joinGame',
  MAKE_CHOICE: 'makeChoice',
  PLAY_AGAIN: 'playAgain',
  LEAVE_GAME: 'leaveGame',
} as const;

export const ServerEvents = {
  GAME_CREATED: 'gameCreated',
  GAME_JOINED: 'gameJoined',
  START_GAME: 'startGame',
  OPPONENT_CHOICE_MADE: 'opponentChoiceMade',
  START_COUNTDOWN: 'startCountdown',
  REVEAL_CHOICES: 'revealChoices',
  NEW_ROUND: 'newRound',
  INVALID_OTP: 'invalidOTP',
  ROOM_FULL: 'roomFull',
  OPPONENT_DISCONNECTED: 'opponentDisconnected',
  SERVER_SHUTDOWN: 'serverShutdown',
} as const;

export interface SessionPayload {
  otp: string;
  roomId: string;
}

export interface RevealPayload {
  choices: Record<string, string>;
  result: 'draw' | 'player1' | 'player2' | 'invalid';
  winnerId: string | null;
}
