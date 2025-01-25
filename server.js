// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createServer } = require('http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('url');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const next = require('next');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Server } = require("socket.io");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { $ } = require("zx");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs/promises");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
  STORAGE_DIR: 'storage',
  OUTPUT_DIR: 'output/Music',
};

let isVotifyRunning = false;
let currentController = null;

const ensureDirectoryExists = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

const saveBase64File = async (base64Data, filePath) => {
  if (!base64Data) return false;
  const fileData = base64Data.split(';base64,').pop();
  await fs.writeFile(filePath, fileData, 'base64');
  return true;
};

const startVotifyProcess = async (socket, controller) => {
  try {
    await ensureDirectoryExists(CONFIG.OUTPUT_DIR);

    const process = $({ signal: controller.signal })`
      votify \
      --audio-quality aac-high \
      --wvd-path ${path.join(CONFIG.STORAGE_DIR, 'device.wvd')} \
      --cookies-path ${path.join(CONFIG.STORAGE_DIR, 'cookies.txt')} \
      --read-urls-as-txt \
      --output-path ${CONFIG.OUTPUT_DIR} \
      --truncate 256 \
      --download-mode aria2c \
      --no-config-file true \
      ${path.join(CONFIG.STORAGE_DIR, 'links.txt')}
    `;

    process.stdout.on('data', (chunk) => socket.emit('logs', chunk.toString()));
    process.stderr.on('data', (chunk) => socket.emit('logs', chunk.toString()));

    return process;
  } catch (err) {
    throw new Error(`Failed to start votify: ${err.message}`);
  }
};

const app = next({
  dev: process.env.NODE_ENV !== 'production',
  hostname: CONFIG.HOST,
  port: CONFIG.PORT
});

const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await ensureDirectoryExists(CONFIG.STORAGE_DIR);

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', socket => {
    console.log('Client connected');

    socket.on('kill', () => {
      if (currentController) {
        currentController.abort('Process killed by user');
        currentController = null;
        isVotifyRunning = false;
        io.emit('logs', '\n=== Process killed by user ===\n');
      }
    });

    socket.on('start', async (data) => {
      if (isVotifyRunning) {
        socket.emit('logs', 'votify process is already running');
        return;
      }

      try {
        const wvdSaved = await saveBase64File(
          data.wvdFileData,
          path.join(CONFIG.STORAGE_DIR, 'device.wvd')
        );
        if (!wvdSaved) {
          socket.emit('logs', '\n=== Widevine key is missing. Using last saved key. ===\n');
        }

        const cookiesSaved = await saveBase64File(
          data.cookiesFileData,
          path.join(CONFIG.STORAGE_DIR, 'cookies.txt')
        );
        if (!cookiesSaved) {
          socket.emit('logs', '\n=== Cookies are missing. Using last saved cookies. ===\n');
        }

        await fs.writeFile(path.join(CONFIG.STORAGE_DIR, 'links.txt'), data.links);

        isVotifyRunning = true;
        currentController = new AbortController();

        const process = await startVotifyProcess(socket, currentController);

        process.catch((err) => {
          socket.emit('logs', `\n=== Process terminated: ${err.message} ===\n`);
        }).finally(() => {
          isVotifyRunning = false;
          currentController = null;
        });
      } catch (err) {
        isVotifyRunning = false;
        currentController = null;
        socket.emit('logs', 'Error: ' + err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // Cleanup on server shutdown
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      if (currentController) {
        currentController.abort('Server shutdown');
      }
      server.close(() => process.exit(0));
    });
  });

  server.listen(CONFIG.PORT, CONFIG.HOST, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});