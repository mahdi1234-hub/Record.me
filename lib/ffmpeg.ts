"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let instance: FFmpeg | null = null;

export async function getFFmpeg(
  onLog?: (msg: string) => void,
  onProgress?: (ratio: number) => void
): Promise<FFmpeg> {
  if (instance && instance.loaded) return instance;
  const ff = new FFmpeg();
  if (onLog) ff.on("log", ({ message }) => onLog(message));
  if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));

  // Load core from unpkg CDN — no localhost
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  instance = ff;
  return ff;
}

export async function trimVideo(
  blob: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg(undefined, onProgress);
  const inputName = "input.webm";
  const outputName = "output.webm";
  await ff.writeFile(inputName, await fetchFile(blob));
  const duration = Math.max(0.1, endSec - startSec);
  await ff.exec([
    "-ss",
    startSec.toFixed(3),
    "-i",
    inputName,
    "-t",
    duration.toFixed(3),
    "-c",
    "copy",
    outputName,
  ]);
  const data = (await ff.readFile(outputName)) as Uint8Array;
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});
  // Copy to a fresh ArrayBuffer to satisfy Blob typing across environments
  const buf = new Uint8Array(data.byteLength);
  buf.set(data);
  return new Blob([buf], { type: "video/webm" });
}
