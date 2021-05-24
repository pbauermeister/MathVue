# Server setup, with Docker

This file replaces the now obsolete README-SERVER.md.

MathVue, in addition to being browsable from static local files, can
also be served by a backend.

The benefits are being able to interact with Dropbox.

This document describes the server setup and devlopment steps.

## Development server

Study the Dockerfile and apply similar config to your system.

Or develop server-side by re-starting the docker container (as below)
which may be ok since re-builds are quite fast.

## Production server

```
docker-compose down
docker-compose up --build -d && docker-compose logs -f
```

Please note that the web server will be at port 3001 using HTTP. You
may want to add a fronting reverse-proxy (serving https at standard
ports).
