'use strict';

const DEFAULT_ORIGINS = [
  'https://ppc-frontend-mb.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const config = Object.freeze({
  port: Number(process.env.PORT) || 5555,
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ORIGINS,
  game: Object.freeze({
    revealDelayMs: Number(process.env.REVEAL_DELAY_MS) || 3000,
    roomTtlMs: 30 * 60 * 1000,
    playerTtlMs: 5 * 60 * 1000,
    cleanupIntervalMs: 5 * 60 * 1000,
  }),
});

module.exports = config;
