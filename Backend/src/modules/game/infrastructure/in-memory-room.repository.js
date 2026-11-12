'use strict';

class InMemoryRoomRepository {
  constructor() {
    this.rooms = new Map();
  }

  findById(id) {
    return this.rooms.get(id) ?? null;
  }

  exists(id) {
    return this.rooms.has(id);
  }

  save(room) {
    this.rooms.set(room.id, room);
    return room;
  }

  delete(id) {
    this.rooms.delete(id);
  }

  all() {
    return [...this.rooms.values()];
  }

  count() {
    return this.rooms.size;
  }
}

module.exports = { InMemoryRoomRepository };
