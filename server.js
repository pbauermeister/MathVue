const express = require('express')
const app = express()

app.get('/hello', (req, res) => res.send('==> Hello World!\n'));

//app.get('/mathvue/*', (req, res) => res.send(`==> accessed ${req.url}\n`));

app.use(express.static('.'))

app.listen(3001, () => console.log('Example app listening on port 3001!'));
