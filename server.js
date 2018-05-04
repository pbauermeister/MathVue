const express = require('express');
const https = require("https");
const app = express()
const request = require('request');

const message = 'MathVue app (a Node.js backend) listening on port 3001!';

// This server just serves the static files. So it does almost nothing.
app.use(express.static('.'));
app.listen(3001, () => console.log(message));
