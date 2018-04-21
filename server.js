const express = require('express');
const https = require("https");
const app = express()

const request = require('request');


app.get('/hello', (req, res) => res.send('==> Hello World!\n'));

//app.get('/*', (req, res) => res.send(`==> accessed ${req.url}\n`));

app.get('/auth', async function(req, res) {
  console.log('Auth:', req.query.code);

  var options = {
//    host: 'api.dropbox.com',
//    path: '/oauth2/token',
    form: {
      code: req.query.code,
      grant_type: 'authorization_code',
      redirect_uri: 'http://localhost:3001/'
    },
    auth: {
      user: '65hebhcza1whb68',
      pass:'97bps11tjfoqex0'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  };
      
  request.post('https://api.dropbox.com/oauth2/token',
               options,
               function(err2, res2, body2) {
                 if (err2) {
                   res.status(500);
                   res.end(JSON.stringify({success:false, error:err2}));                   
                 } else {
                   //console.log("res:", res2);
                   console.log("body:", body2);
                   res.send(body2);
                 }
  });

  //  curl https://api.dropbox.com/oauth2/token -d code=<authorization code> -d grant_type=authorization_code -d redirect_uri=<redirect URI> -u <app key>:<app secret>
});

app.use(express.static('.'));

app.listen(3001, () => console.log('Example app listening on port 3001!'));
