#!/usr/bin/env node

const express = require('express');
const mDNS = require('mdns');
const serveIndex = require('serve-index');
const yargs = require('yargs');

const args = yargs
  .usage('serve-this --port PORT [--mdns|--host HOST]')
  .options({
    host: {
      default: '0.0.0.0',
      describe: 'The host to serve from.',
      requiresArg: 1,
    },
    mdns: {
      boolean: true,
      describe: 'Advertise this service over mDNS.',
    },
    port: {
      coerce: value => {
        if (/^[1-9][0-9]*$/.test(value)) {
          const result = parseInt(value, 10);

          if (result < 65535) {
            return result;
          }
        }

        throw new Error(`Invalid port: ${value}`);
      },
      demandOption: true,
      describe: 'The port to serve on.',
      requiresArg: 1,
    },
  })
  .help().argv;

if (args.mdns && args.host !== '0.0.0.0') {
  console.error('--mdns and --host are mutually exclusive.');
  process.exit(1);
}

const shutdown = function shutdown(signal, server, advert) {
  console.log(`RECEIVED signal ${signal}: shutting down...`);

  if (advert) {
    advert.stop();
  }

  server.close();
};

const handles = new Set();
const server = express()
  .use(express.static('.'))
  .use(serveIndex('.'))
  .listen(args.port, args.host, () => {
    const advert = args.mdns
      ? mDNS.createAdvertisement(mDNS.tcp('http'), args.port)
      : null;

    process
      .on('SIGTERM', () => shutdown('SIGTERM', server, advert))
      .on('SIGINT', () => shutdown('SIGINT', server, advert));
  })
  .on('connection', socket => socket.setTimeout(2000));
