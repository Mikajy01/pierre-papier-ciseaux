'use strict';

class Player {
  constructor(id, now = Date.now()) {
    this.id = id;
    this.roomId = null;
    this.lastActivity = now;
  }

  touch(now = Date.now()) {
    this.lastActivity = now;
  }

  isInactive(now, ttlMs) {
    return now - this.lastActivity > ttlMs;
  }
}

module.exports = { Player };
