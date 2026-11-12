'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { determineWinner } = require('../src/modules/game/domain/rules');

test('determineWinner', () => {
  assert.equal(determineWinner('pierre', 'ciseau'), 'player1');
  assert.equal(determineWinner('papier', 'pierre'), 'player1');
  assert.equal(determineWinner('ciseau', 'papier'), 'player1');
  assert.equal(determineWinner('ciseau', 'pierre'), 'player2');
  assert.equal(determineWinner('papier', 'papier'), 'draw');
  assert.equal(determineWinner('lezard', 'papier'), 'invalid');
});
