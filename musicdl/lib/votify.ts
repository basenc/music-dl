import { broadcast } from "./ws.ts";
import { join } from "$std/path/join.ts";

export type Task = {
  links: string;
  wvdData: string;
  cookiesData: string;
};

const readConfig = async () => {
  const url = new URL("../../config.json", import.meta.url);
  const txt = await Deno.readTextFile(url);
  return JSON.parse(txt) as { OUTPUT_DIR: string };
};

const dataUrlToBytes = (dataUrl: string) => {
  const comma = dataUrl.indexOf(",");
  const b64 = dataUrl.slice(comma + 1);
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return arr;
};

class VotifyManager {
  private static instance: VotifyManager;
  private child: Deno.ChildProcess | null = null;
  private running = false;
  private tempDir: string | null = null;

  static getInstance() {
    if (!this.instance) this.instance = new VotifyManager();
    return this.instance;
  }

  async start(task: Task) {
    if (this.running) {
      return broadcast("> Process is already running\n");
    }
    this.running = true;
    try {
      const cfg = await readConfig();
      const outputPath = cfg.OUTPUT_DIR;

      let info: Deno.FileInfo | null = null;
      try {
        info = await Deno.stat(outputPath);
      } catch {
        info = null;
      }
      if (!info) {
        broadcast(`> Output directory does not exist: ${outputPath}\n`);
        this.running = false;
        return;
      }
      if (!info.isDirectory) {
        broadcast(`> Output path is not a directory: ${outputPath}\n`);
        this.running = false;
        return;
      }

      const tempDir = await Deno.makeTempDir({ prefix: "musicdl-" });
      this.tempDir = tempDir;

      await Deno.writeFile(
        join(tempDir, "device.wvd"),
        dataUrlToBytes(task.wvdData),
      );
      await Deno.writeFile(
        join(tempDir, "cookies.txt"),
        dataUrlToBytes(task.cookiesData),
      );
      await Deno.writeTextFile(
        join(tempDir, "links.txt"),
        task.links,
      );

      broadcast("> Starting Votify process\n");

      const cmd = new Deno.Command("votify", {
        args: [
          "--audio-quality",
          "aac-high",
          "--wvd-path",
          join(tempDir, "device.wvd"),
          "--cookies-path",
          join(tempDir, "cookies.txt"),
          "--read-urls-as-txt",
          "--output-path",
          outputPath,
          "--truncate",
          "256",
          "--download-mode",
          "aria2c",
          "--no-config-file",
          "true",
          join(tempDir, "links.txt"),
        ],
        stdout: "piped",
        stderr: "piped",
      });

      this.child = cmd.spawn();

      const pipe = async (rs: ReadableStream<Uint8Array> | null) => {
        if (!rs) return;
        await rs
          .pipeThrough(new TextDecoderStream())
          .pipeTo(
            new WritableStream<string>({
              write: (chunk) => broadcast(chunk),
            }),
          );
      };

      pipe(this.child.stdout).catch((err) =>
        broadcast(`> Output pipe error: ${String(err)}\n`)
      );
      pipe(this.child.stderr).catch((err) =>
        broadcast(`> Output pipe error: ${String(err)}\n`)
      );

      this.child.status
        .then((status) => {
          if (!status.success) {
            broadcast(`> Process exited with code ${status.code}\n`);
          } else {
            broadcast("> Process completed successfully\n");
          }
        })
        .catch((err) => broadcast(`> Process error: ${String(err)}\n`))
        .finally(() => {
          this.running = false;
          this.child = null;
          const td = this.tempDir;
          this.tempDir = null;
          if (td) Deno.remove(td, { recursive: true }).catch(() => {});
        });
    } catch (err) {
      broadcast(`> Error starting process: ${String(err)}\n`);
      const td = this.tempDir;
      this.tempDir = null;
      if (td) await Deno.remove(td, { recursive: true }).catch(() => {});
      if (this.child) {
        try {
          this.child.kill("SIGKILL");
        } catch (_e) {
          void 0;
        }
      }
      this.running = false;
      this.child = null;
      return;
    }
  }

  stop() {
    if (!this.child) return broadcast("> Process is not running\n");
    try {
      this.child.kill("SIGKILL");
      broadcast("> Process killed\n");
    } catch (err) {
      broadcast(`> Error stopping process: ${String(err)}\n`);
    } finally {
      this.running = false;
      this.child = null;
      const td = this.tempDir;
      this.tempDir = null;
      if (td) Deno.remove(td, { recursive: true }).catch(() => undefined);
    }
  }
}

export const Votify = VotifyManager.getInstance();
