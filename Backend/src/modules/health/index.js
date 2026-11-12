'use strict';

const { Router } = require('express');

/** @param {{ stats: () => object }} statsProvider */
function createHealthModule({ app, statsProvider }) {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'healthy', ...statsProvider.stats(), timestamp: new Date().toISOString() });
  });
  app.use(router);
}

module.exports = { createHealthModule };
