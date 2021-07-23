'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
const testChecker = require('./testChecker');
const encoding = require('encoding');


const router = express.Router();
router.get('/', (req, res) => {

  const id = "686280026";
  const dob = "07/12/2021";

  axios.post('https://webhook.site/bb1ebd56-98ed-4207-999a-5f4be5072af7', id)

});
router.get('/dev', (req, res) => {

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello from Express.js!</h1>');
  res.end();

  

});
router.get('/another', (req, res) => res.json({ route: req.originalUrl }));
router.post('/', (req, res) => res.json({ postBody: req.body }));

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
