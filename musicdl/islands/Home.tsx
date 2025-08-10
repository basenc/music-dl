import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { AnsiUp } from "ansi_up";
import Fa from "../components/Fa.tsx";
import {
  faFileText,
  faPlay,
  faStop,
} from "npm:@fortawesome/free-solid-svg-icons";

export default function Home() {
  const logs = useSignal("");
  const logsRef = useSignal<HTMLElement | null>(null);
  const links = useSignal("");
  const wvdFile = useSignal<File | null>(null);
  const cookiesFile = useSignal<File | null>(null);
  const wvdData = useSignal<string | null>(null);
  const cookiesData = useSignal<string | null>(null);
  const ansi = new AnsiUp();

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${location.host}/api/ws`);

    ws.addEventListener("close", () => {
      logs.value += "> Disconnected from server\n";
      if (logsRef.value) {
        logsRef.value.innerHTML = ansi.ansi_to_html(logs.value);
      }
    });
    ws.addEventListener("message", (event) => {
      const data = typeof event.data === "string" ? event.data : "";
      logs.value += data;
      if (logsRef.value) {
        logsRef.value.innerHTML = ansi.ansi_to_html(logs.value);
        logsRef.value.scrollTop = logsRef.value.scrollHeight;
      }
    });

    return () => ws.close();
  }, []);

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const readWvdFile = async (file: File) => {
    wvdFile.value = file;
    wvdData.value = await readAsDataURL(file);
    logs.value += `> WVD file "${file.name}" read successfully\n`;
    if (logsRef.value) logsRef.value.innerHTML = ansi.ansi_to_html(logs.value);
  };

  const readCookiesFile = async (file: File) => {
    cookiesFile.value = file;
    cookiesData.value = await readAsDataURL(file);
    logs.value += `> Cookies file "${file.name}" read successfully\n`;
    if (logsRef.value) logsRef.value.innerHTML = ansi.ansi_to_html(logs.value);
  };

  const handleStart = async () => {
    const t = (links.value || "").trim();
    if (!t) {
      logs.value += "> No links entered\n";
      return;
    }
    await fetch("/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        links: t,
        wvdData: wvdData.value,
        cookiesData: cookiesData.value,
      }),
    });
  };

  const handleKill = async () => {
    await fetch("/api/kill", { method: "POST" });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-7xl p-4 md:p-6 lg:p-8">
        <span
          id="votify-label"
          className="m-3 mb-6 flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-bold"
        >
          <span className="ml-2">Votify</span>
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          <div className="border-2 border-solid">
            <pre
              id="votify-logs"
              ref={(el) => (logsRef.value = el as HTMLElement)}
              className="text-xs w-full min-h-[16rem] md:min-h-[20rem] lg:min-h-[24rem] p-2 md:p-3 overflow-y-auto no-scrollbar whitespace-pre-wrap break-words font-mono"
            />
          </div>
          <div className="border-2 border-solid">
            <textarea
              id="votify-links"
              className="text-xs w-full min-h-[16rem] md:min-h-[20rem] lg:min-h-[24rem] p-2 md:p-3 resize-none no-scrollbar"
              placeholder="Enter Spotify playlist links..."
              autoFocus
              value={links.value}
              onInput={(
                e,
              ) => (links.value =
                (e.currentTarget as HTMLTextAreaElement).value)}
              onChange={(
                e,
              ) => (links.value =
                (e.currentTarget as HTMLTextAreaElement).value)}
            />
          </div>
          <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4">
            <div className="w-full md:w-1/2">
              <input
                id="votify-wvd"
                type="file"
                accept=".wvd"
                onChange={(e) =>
                  readWvdFile((e.currentTarget.files?.[0] as File) || null)}
                className="hidden"
              />
              <label
                htmlFor="votify-wvd"
                className="flex items-center gap-2 p-3 md:p-4 border-2 border-solid rounded cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Fa icon={faFileText} />
                <span className="truncate">
                  {wvdFile.value ? wvdFile.value.name : ".wvd"}
                </span>
              </label>
            </div>
            <div className="w-full md:w-1/2">
              <input
                id="votify-cookies"
                type="file"
                accept=".txt"
                onChange={(e) =>
                  readCookiesFile((e.currentTarget.files?.[0] as File) || null)}
                className="hidden"
              />
              <label
                htmlFor="votify-cookies"
                className="flex items-center gap-2 p-3 md:p-4 border-2 border-solid rounded cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Fa icon={faFileText} />
                <span className="truncate">
                  {cookiesFile.value ? cookiesFile.value.name : ".txt"}
                </span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 md:gap-4">
            <button
              id="votify-start"
              type="button"
              className="w-full p-3 md:p-4 border-2 border-solid hover:bg-gray-50 transition-colors"
              onClick={handleStart}
            >
              <Fa icon={faPlay} /> Start
            </button>
            <button
              id="votify-kill"
              type="button"
              className="w-full p-3 md:p-4 border-2 border-solid hover:bg-gray-50 transition-colors"
              onClick={handleKill}
            >
              <Fa icon={faStop} /> Kill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
