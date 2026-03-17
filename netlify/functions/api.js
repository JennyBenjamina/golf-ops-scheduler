const express = require('express');
const serverless = require('serverless-http');
const router = require('../../server/router');

const app = express();

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api', router);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports.handler = serverless(app);
