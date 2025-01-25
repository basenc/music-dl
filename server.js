const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const { $ } = require("zx");
const fs = require("node:fs");

if (!fs.existsSync('storage')) {
  fs.mkdirSync('storage');
}

const app = next({
  dev: process.env.NODE_ENV !== 'production',
  hostname: '0.0.0.0', // Add this line
  port: 3000 // Add this line
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);
  let isVotifyRunning = false;

  io.on('connection', socket => {
    console.log('Client connected');

    socket.on('start', (data) => {
      console.log('Received Widevine key: ', data.wvdFileName);
      console.log('Received cookies: ', data.cookiesFileName);
      console.log('Downloading links: ', data.links);

      if (data.wvdFileName) {
        const wvdFileData = data.wvdFileData.split(';base64,').pop();
        fs.writeFileSync('storage/device.wvd', wvdFileData, 'base64');
      } else {
        console.log('Widevine key is missing. Using last saved key.');
        socket.emit('logs', '\n=== Widevine key is missing. Using last saved key. ===\n');
      }
      if (data.cookiesFileName) {
        const cookiesFileData = data.cookiesFileData.split(';base64,').pop();
        fs.writeFileSync('storage/cookies.txt', cookiesFileData, 'base64');
      } else {
        console.log('Cookies are missing. Using last saved cookies.');
        socket.emit('logs', '\n=== Cookies are missing. Using last saved cookies. ===\n');
      }

      fs.writeFileSync('storage/links.txt', data.links);

      if (isVotifyRunning) {
        socket.emit('logs', 'votify process is already running');
        return;
      }
      isVotifyRunning = true;
      try {
        if (!fs.existsSync('output/Music')) {
          fs.mkdirSync('output/Music', { recursive: true });
        }

        const process = $`votify \
          --audio-quality aac-high \
          --wvd-path storage/device.wvd \
          --cookies-path storage/cookies.txt \
          --read-urls-as-txt \
          --output-path output/Music \
          --truncate 256 \
          --download-mode aria2c \
          --no-config-file true \
          storage/links.txt
        `;
        process.stdout.on('data', (chunk) => {
          socket.emit('logs', chunk.toString());
        });
        process.stderr.on('data', (chunk) => {
          socket.emit('logs', chunk.toString());
        });
        process.catch(() => {}).finally(() => {
          isVotifyRunning = false;
        });
      } catch (err) {
        isVotifyRunning = false;
        socket.emit('logs', 'Error starting votify: ' + err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  server.listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('> Ready on http://0.0.0.0:3000');
  });
});