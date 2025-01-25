import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from "socket.io";
import type { Socket as SocketIO } from "socket.io";
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from "zx";
import CONFIG from './config.json';

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Utils
export function indentString({str, count, indent = " ", prefix = ">"}: {str: string, count: number, indent?: string, prefix?: string}): string {
  return String(str).replace(/^/gm, prefix + indent.repeat(count));
}

export function URIDataToBlob(data: string): Blob {
  const splitData = data.split(',');
  const mimeString = splitData[0].split(":")[1].split(";")[0];
  const byteString = Buffer.from(splitData[1], "base64");
  return new Blob([byteString], { type: mimeString });
}

export class VotifyManager {
  private static instance: VotifyManager;
  private isRunning: boolean = false;
  private socket: SocketIO | null = null;
  private constructor() {}
  private storagePath = CONFIG.STORAGE_DIR;
  private outputPath = CONFIG.OUTPUT_DIR
  private controller: AbortController | null = null;

  public static getInstance(): VotifyManager {
    if (!VotifyManager.instance) {
      VotifyManager.instance = new VotifyManager();
    }
    return VotifyManager.instance;
  }

  public setSocket(socket: SocketIO): void {
    this.socket = socket;
  }

  public isVotifyRunning(): boolean {
    return this.isRunning;
  }

  private logToSocket(message: string): void {
    this.socket!.emit('logs', message);
    this.socket!.broadcast.emit('logs', message);
  }

  public async startDownload(): Promise<void> {
    this.controller = new AbortController();

    if (this.isRunning) {
      this.logToSocket('> Process is already running\n');
      return;
    }

    try {
      this.isRunning = true;
      const process = $({
        stdio: ['ignore', 'pipe', 'pipe'],
        signal: this.controller.signal
      })`
        votify \
        --audio-quality aac-high \
        --wvd-path ${this.storagePath}/device.wvd \
        --cookies-path ${this.storagePath}/cookies.txt \
        --read-urls-as-txt \
        --output-path ${this.outputPath} \
        --truncate 256 \
        --download-mode aria2c \
        --no-config-file true \
        ${this.storagePath}/links.txt
      `;

      process.stdout!.setEncoding('utf8');
      process.stderr!.setEncoding('utf8');

      process.stdout!.on('data', (data) => this.logToSocket(data));
      process.stderr!.on('data', (data) => this.logToSocket(data));

      await process.catch((err) => {
        if (err.signal !== 'SIGTERM') {
          this.logToSocket(`> Process error: ${err.message}\n`);
        }
      });

    } catch (err) {
      this.logToSocket(`> Error: ${err}\n`);
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  public async stopDownload(): Promise<void> {
    if (!this.isRunning) {
      this.logToSocket('> Process is not running\n');
      return;
    }

    try {
      this.controller?.abort();
      this.isRunning = false;
      this.logToSocket('> Process killed\n');
    } catch (err) {
      this.logToSocket(`> Error stopping votify: ${err}\n`);
      throw err;
    }
  }
}

// Server
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    const { pathname } = parsedUrl

    if (pathname === '/api/socket') {
    }

    handle(req, res, parsedUrl)
  }).listen(port)

  const io = new SocketIOServer(server);

  io.on('connection', (socket) => {
    const Votify = VotifyManager.getInstance();
    Votify.setSocket(socket);

    console.log(`> A user connected: ${socket.id}`);
    io.emit('logs', `> Connected to server as ${socket.id}\n`);

    socket.on('start', async (data) => {
      console.log(`> Starting download links:\n${indentString({str: data.links, count: 2})}`);
      io.emit('logs', '> Starting download links:\n' + indentString({str: data.links, count: 2}) + '\n');

      if (data.wvdData) {
        const blob = URIDataToBlob(data.wvdData);
        const buffer = Buffer.from(await blob.arrayBuffer());
        await fs.writeFile(path.join(CONFIG.STORAGE_DIR, data.wvdFileName), buffer)
      } else {
        console.log('> No WVD file provided. Using previous WVD file');
        io.emit('logs', '> No WVD file provided. Using previous WVD file\n');
      }

      if (data.cookiesData) {
        const blob = URIDataToBlob(data.cookiesData);
        const buffer = Buffer.from(await blob.arrayBuffer());
        await fs.writeFile(path.join(CONFIG.STORAGE_DIR, data.cookiesFileName), buffer)
      } else {
        console.log('> No cookies file provided. Using previous cookies file');
        io.emit('logs', '> No cookies file provided. Using previous cookies file\n');
      }

      await fs.writeFile(path.join(CONFIG.STORAGE_DIR, 'links.txt'), data.links);

      console.log('> Starting Votify process');
      io.emit('logs', '> Starting Votify process\n');

      await Votify.startDownload();
    });

    socket.on('kill', async () => {
      console.log('> Killing Votify process');
      io.emit('logs', '> Killing Votify process\n');
      await Votify.stopDownload();
    });

    socket.on('disconnect', () => {
      io.emit('logs', `> Disconnected from server as ${socket.id}\n`);
      console.log(`> A user disconnected: ${socket.id}`);
    });
  });

  console.log(
    `> Server listening at http://localhost:${port} as ${
      dev ? 'development' : process.env.NODE_ENV
    }`
  )
})