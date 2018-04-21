const express = require('express');
const https = require("https");
const app = express()

const request = require('request');


app.get('/hello', (req, res) => res.send('==> Hello World!\n'));

//app.get('/*', (req, res) => res.send(`==> accessed ${req.url}\n`));

app.use(express.static('.'));

app.listen(3001, () => console.log('Example app listening on port 3001!'));
