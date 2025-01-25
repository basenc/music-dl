/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useRef } from "react";
import { socket } from "./socket.js";
import { FiUpload } from "react-icons/fi";
import { BsSpotify, BsFileEarmarkText, BsCheckLg } from "react-icons/bs";
import Image from 'next/image'

export default function Home() {
  const [logs, setLogs] = useState<string>("");
  const [links, setLinks] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsRef = useRef<HTMLTextAreaElement>(null);
  const [wvdFile, setWvdFile] = useState<File | null>(null);
  const [cookiesFile, setCookiesFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAutoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);
      setLogs(logs => logs + `=== Connected via ${socket.io.engine.transport.name} ===\n`);

      socket.io.engine.on("upgrade", (transport: { name: string }) => {
        setTransport(transport.name);
        setLogs(logs => logs + `=== Connection upgraded to ${transport.name} ===\n`);
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setTransport("N/A");
      setLogs(logs => logs + "\n=== Disconnected ===\n");
    };

    const handleLogs = (data: string) => {
      setLogs(logs => logs + data);
    };

    if (socket.connected) handleConnect();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("logs", handleLogs);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("logs", handleLogs);
    };
  }, []);

  const handleLogsScroll = () => {
    if (logsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsRef.current;
      setIsAutoScroll(scrollTop + clientHeight >= scrollHeight - 10);
    }
  };

  const handleStart = async () => {
    const readFile = (file: File): Promise<string | ArrayBuffer | null> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

    const wvdContent = wvdFile ? await readFile(wvdFile) : null;
    const cookiesContent = cookiesFile ? await readFile(cookiesFile) : null;

    socket.emit("start", {
      links,
      wvdFileName: wvdFile?.name || "",
      wvdFileData: wvdContent || null,
      cookiesFileName: cookiesFile?.name || "",
      cookiesFileData: cookiesContent || null,
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-7xl p-4 md:p-6 lg:p-8">
        {/* Top bar */}
        <span
          id="votify-label"
          className="m-3 mb-6 flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-bold"
        >
          <BsSpotify />
          <span className="ml-2">Votify</span>
        </span>
        {/* Content table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          {/* Logs */}
          <div className="border-2 border-solid">
            <textarea
              id="votify-logs"
              ref={logsRef}
              onScroll={handleLogsScroll}
              className="text-xs w-full min-h-[16rem] md:min-h-[20rem] lg:min-h-[24rem] p-2 md:p-3 resize-none no-scrollbar"
              placeholder="Nothing to show yet..."
              value={logs}
              readOnly
            />
          </div>
          {/* Links */}
          <div className="border-2 border-solid">
            <textarea
              id="votify-links"
              className="text-xs w-full min-h-[16rem] md:min-h-[20rem] lg:min-h-[24rem] p-2 md:p-3 resize-none no-scrollbar"
              placeholder="Enter Spotify playlist links..."
              autoFocus
              onChange={(e) => setLinks(e.target.value)}
            />
          </div>
          {/* Upload buttons */}
          <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4">
            <div className="w-full md:w-1/2">
              <input
                id="votify-wvd"
                type="file"
                accept=".wvd"
                onChange={(e) => setWvdFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="votify-wvd"
                className="flex items-center gap-2 p-3 md:p-4 border-2 border-solid rounded cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-[20px] flex items-center justify-center">
                  {wvdFile ? <BsCheckLg className="text-lg" /> : <FiUpload />}
                </div>
                <span className="truncate">{wvdFile ? wvdFile.name : ".wvd"}</span>
              </label>
            </div>
            <div className="w-full md:w-1/2">
              <input
                id="votify-cookies"
                type="file"
                accept=".txt"
                onChange={(e) => setCookiesFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="votify-cookies"
                className="flex items-center gap-2 p-3 md:p-4 border-2 border-solid rounded cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-[20px] flex items-center justify-center">
                  {cookiesFile ? <BsCheckLg className="text-lg" /> : <BsFileEarmarkText />}
                </div>
                <span className="truncate">{cookiesFile ? cookiesFile.name : ".txt"}</span>
              </label>
            </div>
          </div>
          {/* Start button */}
          <button
            id="votify-start"
            className="w-full p-3 md:p-4 border-2 border-solid hover:bg-gray-50 transition-colors"
            onClick={handleStart}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
