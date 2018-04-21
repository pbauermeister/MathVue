# Server setup

MathVue, in addition to being browsable from static local files, can
also be served by a backend.

The benefits are being able to interact with Dropbox.

This document describes the server setup and devlopment steps.

Assuming user is `mathvue`, and we are in its home directory `/home/MathVue`.

## 1. Prepare project

```
npm init
# answer questions

npm install --save express
```

## 2. Update project (whenever packages changed)

```
nom update
```

## 3. Run and install server

Run server:
```
pm2 start server.js
```

Test server:
```
curl localhost:3001/hello
==> Hello World!
```

## 4. Auto-start server

```
sudo pm2 startup ubuntu -u mathvue --hp /home/mathvue/
sudo pm2 save
```

## If fronted by Nginx, add reverse-proxy rule

As root:

```
nano /etc/nginx/sites-available/default
```
---------------------------------------------------
```
server {
  listen 80;
  server_name example.com;
  
  # mathvue
  location /mathvue/ {
    proxy_pass http://localhost:3001/;
    #                               ^ this matters!
    # https://example.com/mathvue/xyz ==> http://localhost:3001/xyz
    
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
---------------------------------------------------

```
service nginx restart
```

## 5. PM2 autostart

As user mathvue:
```
sudo pm2 startup ubuntu -u mathvue --hp /home/mathvue/
sudo pm2 save
```

## 6. Develop

Restart server:
```
pm2 restart server.js
```
