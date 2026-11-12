'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GameService } = require('../src/modules/game/application/game.service');
const { InMemoryRoomRepository } = require('../src/modules/game/infrastructure/in-memory-room.repository');
const { InMemoryPlayerRepository, Player } = require('../src/modules/player');

function setup() {
  const sent = [];
  const scheduled = [];
  const notifier = {
    joinChannel() {},
    leaveChannel() {},
    toPlayer: (to, event, payload) => sent.push({ to, event, payload }),
    toRoom: (to, event, payload) => sent.push({ to, event, payload }),
    toRoomExcept: (to, _ex, event, payload) => sent.push({ to, event, payload }),
  };
  const players = new InMemoryPlayerRepository();
  const service = new GameService({
    rooms: new InMemoryRoomRepository(),
    players,
    notifier,
    generateOtp: () => '1234',
    settings: { revealDelayMs: 0, roomTtlMs: 1000, playerTtlMs: 1000 },
    logger: { info() {}, warn() {}, error() {} },
    schedule: (fn) => scheduled.push(fn),
  });
  service.connect(new Player('a'));
  service.connect(new Player('b'));
  const events = (name) => sent.filter((e) => e.event === name);
  return { service, sent, scheduled, events };
}

test('full round: create, join, choose, reveal', () => {
  const { service, scheduled, events } = setup();
  service.createGame('a');
  assert.deepEqual(events('gameCreated')[0].payload, { otp: '1234', roomId: 'room_1234' });

  service.joinGame('b', '1234');
  assert.equal(events('startGame').length, 1);

  service.makeChoice('a', 'room_1234', 'pierre');
  assert.equal(events('startCountdown').length, 0);
  service.makeChoice('b', 'room_1234', 'ciseau');
  assert.equal(events('startCountdown').length, 1);

  scheduled.shift()();
  const reveal = events('revealChoices')[0].payload;
  assert.equal(reveal.winnerId, 'a');
  assert.equal(reveal.result, 'player1');
});

test('rejects unknown OTP, full rooms and invalid choices', () => {
  const { service, events, scheduled } = setup();
  service.joinGame('a', '9999');
  assert.equal(events('invalidOTP').length, 1);

  service.createGame('a');
  service.joinGame('b', '1234');
  service.connect(new Player('c'));
  service.joinGame('c', '1234');
  assert.equal(events('roomFull').length, 1);

  service.makeChoice('a', 'room_1234', 'lezard');
  service.makeChoice('b', 'room_1234', 'pierre');
  assert.equal(scheduled.length, 0);
});

test('disconnect notifies opponent and empty rooms are removed', () => {
  const { service, events } = setup();
  service.createGame('a');
  service.joinGame('b', '1234');
  service.disconnect('a');
  assert.equal(events('opponentDisconnected').length, 1);
  service.leaveGame('b', 'room_1234');
  assert.deepEqual(service.stats(), { rooms: 0, players: 1 });
});
