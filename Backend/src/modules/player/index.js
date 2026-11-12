'use strict';

const { Player } = require('./domain/player');
const { InMemoryPlayerRepository } = require('./infrastructure/in-memory-player.repository');

module.exports = { Player, InMemoryPlayerRepository };
