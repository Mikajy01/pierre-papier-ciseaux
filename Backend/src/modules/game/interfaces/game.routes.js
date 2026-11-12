'use strict';

const { Router } = require('express');

function createGameRouter(gameService) {
  const router = Router();
  router.get('/rooms', (_req, res) => res.json(gameService.listRooms()));
  return router;
}

module.exports = { createGameRouter };
