'use strict';

class InMemoryPlayerRepository {
  constructor() {
    this.players = new Map();
  }

  findById(id) {
    return this.players.get(id) ?? null;
  }

  save(player) {
    this.players.set(player.id, player);
    return player;
  }

  delete(id) {
    this.players.delete(id);
  }

  all() {
    return [...this.players.values()];
  }

  count() {
    return this.players.size;
  }
}

module.exports = { InMemoryPlayerRepository };
