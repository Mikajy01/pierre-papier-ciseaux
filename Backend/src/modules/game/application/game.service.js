'use strict';

const { Room } = require('../domain/room');
const { Player } = require('../../player/domain/player');
const { determineWinner } = require('../domain/rules');
const { isValidChoice } = require('../domain/choice');
const { ServerEvents: E } = require('../interfaces/events');

/**
 * Port implemented by the transport layer (Socket.IO gateway).
 * @typedef {Object} GameNotifier
 * @property {(playerId: string, channel: string) => void} joinChannel
 * @property {(playerId: string, channel: string) => void} leaveChannel
 * @property {(playerId: string, event: string, payload?: object) => void} toPlayer
 * @property {(channel: string, event: string, payload?: object) => void} toRoom
 * @property {(channel: string, exceptId: string, event: string, payload?: object) => void} toRoomExcept
 */

class GameService {
  /**
   * @param {object} deps
   * @param {import('../infrastructure/in-memory-room.repository').InMemoryRoomRepository} deps.rooms
   * @param {import('../../player/infrastructure/in-memory-player.repository').InMemoryPlayerRepository} deps.players
   * @param {GameNotifier} deps.notifier
   * @param {() => string} deps.generateOtp
   * @param {{ revealDelayMs: number, roomTtlMs: number, playerTtlMs: number }} deps.settings
   * @param {{ info: Function, warn: Function }} deps.logger
   * @param {(fn: () => void, ms: number) => unknown} [deps.schedule]
   */
  constructor({ rooms, players, notifier, generateOtp, settings, logger, schedule = setTimeout }) {
    this.rooms = rooms;
    this.players = players;
    this.notifier = notifier;
    this.generateOtp = generateOtp;
    this.settings = settings;
    this.logger = logger;
    this.schedule = schedule;
  }

  createGame(playerId) {
    const player = this.players.findById(playerId);
    if (!player) return;

    let otp;
    do {
      otp = this.generateOtp();
    } while (this.rooms.exists(Room.idFromOtp(otp)));

    const room = this.rooms.save(new Room({ id: Room.idFromOtp(otp), otp, hostId: playerId }));
    player.roomId = room.id;
    this.notifier.joinChannel(playerId, room.id);

    this.logger.info(`Game created: ${room.id} by ${playerId}`);
    this.notifier.toPlayer(playerId, E.GAME_CREATED, { otp, roomId: room.id });
  }

  joinGame(playerId, otp) {
    const player = this.players.findById(playerId);
    if (!player) return;

    const room = this.rooms.findById(Room.idFromOtp(otp));
    if (!room) {
      this.logger.warn(`Invalid OTP attempt: ${otp} by ${playerId}`);
      this.notifier.toPlayer(playerId, E.INVALID_OTP);
      return;
    }

    if (room.has(playerId)) {
      this.notifier.toPlayer(playerId, E.GAME_JOINED, { roomId: room.id, otp: room.otp });
      this.notifier.toPlayer(playerId, E.GAME_READY, { players: room.players });
      return;
    }

    if (room.isFull()) {
      this.logger.warn(`Room full attempt: ${room.id} by ${playerId}`);
      this.notifier.toPlayer(playerId, E.ROOM_FULL);
      return;
    }

    room.add(playerId);
    player.roomId = room.id;
    this.notifier.joinChannel(playerId, room.id);

    this.logger.info(`Player joined: ${playerId} joined ${room.id}`);
    this.notifier.toPlayer(playerId, E.GAME_JOINED, { roomId: room.id, otp: room.otp });
    this.notifier.toRoom(room.id, E.GAME_READY, { players: room.players });

    if (room.isFull() && !room.gameStarted) {
      room.gameStarted = true;
      this.logger.info(`Game starting: ${room.id}`);
      this.notifier.toRoom(room.id, E.START_GAME);
    }
  }

  makeChoice(playerId, roomId, choice) {
    const room = this.rooms.findById(roomId);
    if (!room || !room.has(playerId)) {
      this.logger.warn(`Rejected choice from ${playerId} in ${roomId}`);
      return;
    }
    if (!isValidChoice(choice)) {
      this.logger.warn(`Invalid choice "${choice}" from ${playerId}`);
      return;
    }
    if (room.revealPending) return;

    room.recordChoice(playerId, choice);
    this.notifier.toRoomExcept(room.id, playerId, E.OPPONENT_CHOICE_MADE);

    if (!room.bothChose()) return;

    room.revealPending = true;
    this.notifier.toRoom(room.id, E.START_COUNTDOWN);
    this.schedule(() => this.reveal(room.id), this.settings.revealDelayMs);
  }

  reveal(roomId) {
    const room = this.rooms.findById(roomId);
    if (!room) return;
    room.revealPending = false;
    if (!room.bothChose()) {
      room.resetChoices();
      return;
    }

    const [player1, player2] = room.players;
    const choice1 = room.choices[player1];
    const choice2 = room.choices[player2];
    const result = determineWinner(choice1, choice2);
    const winnerId = result === 'player1' ? player1 : result === 'player2' ? player2 : null;

    this.logger.info(`Result in ${room.id}: ${choice1} vs ${choice2} = ${result}`);
    this.notifier.toRoom(room.id, E.REVEAL_CHOICES, {
      choices: { [player1]: choice1, [player2]: choice2 },
      result,
      winnerId,
    });
    room.resetChoices();
  }

  playAgain(playerId, roomId) {
    const room = this.rooms.findById(roomId);
    if (!room || !room.has(playerId)) return;
    room.resetChoices();
    this.notifier.toRoom(room.id, E.NEW_ROUND);
  }

  leaveGame(playerId, roomId) {
    const room = this.rooms.findById(roomId);
    if (!room) return;
    this.notifier.leaveChannel(playerId, room.id);
    const player = this.players.findById(playerId);
    if (player) player.roomId = null;
    this.removeFromRoom(room, playerId);
  }

  connect(player) {
    this.players.save(player);
  }

  disconnect(playerId) {
    const player = this.players.findById(playerId);
    if (player?.roomId) {
      const room = this.rooms.findById(player.roomId);
      if (room) this.removeFromRoom(room, playerId);
    }
    this.players.delete(playerId);
  }

  /** Refreshes activity; re-registers a connected player evicted by cleanup. */
  touch(playerId) {
    const player = this.players.findById(playerId);
    if (player) player.touch();
    else this.players.save(new Player(playerId));
  }

  removeFromRoom(room, playerId) {
    if (!room.remove(playerId)) return;
    this.logger.info(`Player ${playerId} left ${room.id}`);
    if (room.isEmpty()) {
      this.rooms.delete(room.id);
      this.logger.info(`Room deleted: ${room.id}`);
    } else {
      this.notifier.toRoom(room.id, E.OPPONENT_DISCONNECTED);
    }
  }

  cleanup(now = Date.now()) {
    for (const room of this.rooms.all()) {
      if (room.isExpired(now, this.settings.roomTtlMs)) {
        this.logger.info(`Cleaning up inactive room: ${room.id}`);
        this.rooms.delete(room.id);
      }
    }
    for (const player of this.players.all()) {
      if (player.isInactive(now, this.settings.playerTtlMs)) {
        this.logger.info(`Cleaning up inactive player: ${player.id}`);
        this.players.delete(player.id);
      }
    }
  }

  stats() {
    return { rooms: this.rooms.count(), players: this.players.count() };
  }

  listRooms() {
    return this.rooms.all().map((room) => room.toSummary());
  }
}

module.exports = { GameService };
