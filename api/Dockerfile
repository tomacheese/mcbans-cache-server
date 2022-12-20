FROM node:19

RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
COPY yarn.lock .
RUN echo network-timeout 600000 > .yarnrc && \
  yarn install && \
  yarn cache clean

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

COPY src src
COPY public public
COPY tsconfig.json .

ENTRYPOINT [ "/app/entrypoint.sh" ]
