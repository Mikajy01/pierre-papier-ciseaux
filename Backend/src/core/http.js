'use strict';

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');

function createHttp({ corsOrigins }) {
  const app = express();
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  const server = createServer(app);
  return { app, server };
}

module.exports = { createHttp };
