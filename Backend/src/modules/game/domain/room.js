'use strict';

const MAX_PLAYERS = 2;

class Room {
  constructor({ id, otp, hostId, createdAt = Date.now() }) {
    this.id = id;
    this.otp = otp;
    this.players = [hostId];
    this.choices = {};
    this.createdAt = createdAt;
    this.gameStarted = false;
    this.revealPending = false;
  }

  static idFromOtp(otp) {
    return `room_${otp}`;
  }

  has(playerId) {
    return this.players.includes(playerId);
  }

  isFull() {
    return this.players.length >= MAX_PLAYERS;
  }

  isEmpty() {
    return this.players.length === 0;
  }

  add(playerId) {
    if (this.isFull()) throw new Error('Room is full');
    if (!this.has(playerId)) this.players.push(playerId);
  }

  /** @returns {boolean} true if the player was in the room */
  remove(playerId) {
    const index = this.players.indexOf(playerId);
    if (index === -1) return false;
    this.players.splice(index, 1);
    delete this.choices[playerId];
    return true;
  }

  recordChoice(playerId, choice) {
    this.choices[playerId] = choice;
  }

  bothChose() {
    return this.players.length === MAX_PLAYERS && this.players.every((p) => p in this.choices);
  }

  resetChoices() {
    this.choices = {};
  }

  isExpired(now, ttlMs) {
    return now - this.createdAt > ttlMs;
  }

  toSummary() {
    return {
      roomId: this.id,
      otp: this.otp,
      players: this.players.length,
      gameStarted: this.gameStarted,
      createdAt: new Date(this.createdAt).toISOString(),
    };
  }
}

module.exports = { Room, MAX_PLAYERS };
