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

/**
 * Remux a MediaRecorder webm Blob into a proper MP4 for download.
 *
 * MediaRecorder webm files are missing duration metadata and seek cues, so
 * downloaded copies often loop at ~3s or refuse to scrub in external
 * players. Re-encoding through ffmpeg.wasm produces a container with
 * correct duration + index, playable anywhere.
 */
export async function remuxForDownload(
  blob: Blob,
  onProgress?: (ratio: number) => void
): Promise<{ blob: Blob; extension: string; mime: string }> {
  const ff = await getFFmpeg(undefined, onProgress);
  const inputName = "download_in.webm";
  const outputName = "download_out.mp4";
  await ff.writeFile(inputName, await fetchFile(blob));

  // H.264/AAC MP4 is universally playable. faststart moves moov atom to
  // the beginning so the download file opens/scrubs instantly.
  try {
    await ff.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-pix_fmt",
      "yuv420p",
      outputName,
    ]);
    const data = (await ff.readFile(outputName)) as Uint8Array;
    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});
    const buf = new Uint8Array(data.byteLength);
    buf.set(data);
    return {
      blob: new Blob([buf], { type: "video/mp4" }),
      extension: "mp4",
      mime: "video/mp4",
    };
  } catch (e) {
    // Fallback: webm stream copy with duration/cues rewritten.
    console.warn("mp4 remux failed, falling back to webm remux", e);
    const fallbackOut = "download_out.webm";
    await ff.exec(["-i", inputName, "-c", "copy", fallbackOut]);
    const data = (await ff.readFile(fallbackOut)) as Uint8Array;
    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(fallbackOut).catch(() => {});
    const buf = new Uint8Array(data.byteLength);
    buf.set(data);
    return {
      blob: new Blob([buf], { type: "video/webm" }),
      extension: "webm",
      mime: "video/webm",
    };
  }
}
