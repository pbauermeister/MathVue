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
RUN git clone https://github.com/emscripten-core/emsdk.git && \
    (cd emsdk && git pull && ./emsdk install latest && ./emsdk activate latest)

# Install application
COPY --chown=user:user . ./
RUN npm install

RUN pip3 install requests

# Run server
CMD cd emsdk; . ./emsdk_env.sh; cd; nodejs server.js
