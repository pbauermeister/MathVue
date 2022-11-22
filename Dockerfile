FROM debian:buster-slim

# Install tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    nodejs npm \
    python3 python3-pip \
    git tar xz-utils lbzip2 curl

# Finalize npm
#RUN npm i npm@latest -g
RUN nodejs --version
#RUN pip3 install requests

# Create user
RUN useradd --no-log-init user
RUN mkdir /home/user && chown -R user:user /home/user
WORKDIR /home/user
USER user

# Install emscripten for user as per
# https://emscripten.org/docs/getting_started/downloads.html
# We need the 1.x version, as we have unexplained issue with 2.x
RUN git clone https://github.com/emscripten-core/emsdk.git && \
    cd emsdk && \
    git checkout 1.40.1 && \
    ./emsdk install latest && \
    ./emsdk activate latest

# Install application
COPY --chown=user:user package*.json ./
RUN npm install
COPY --chown=user:user . ./

RUN pip3 install requests

# Run server
CMD set -e; \
    echo "Testing TOKEN..."; \
    test ! -z "$TOKEN"; \
    echo "TOKEN is set."; \
    set -x; \
    export PATH=$PATH:/home/user/.local/bin; \
    cd emsdk && . ./emsdk_env.sh && \
    cd && nodejs server.js
