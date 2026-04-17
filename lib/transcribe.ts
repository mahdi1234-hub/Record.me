"use client";

import type { CaptionCue } from "./store";

type TranscribeProgress =
  | { type: "download"; name: string; progress: number }
  | { type: "loading"; message: string }
  | { type: "transcribing"; progress: number }
  | { type: "result"; cues: CaptionCue[]; text: string }
  | { type: "error"; message: string };

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/transcribe.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

export async function transcribeBlob(
  blob: Blob,
  onProgress: (p: TranscribeProgress) => void,
  model: "Xenova/whisper-tiny" | "Xenova/whisper-base" = "Xenova/whisper-tiny"
): Promise<{ cues: CaptionCue[]; text: string }> {
  // Decode audio to PCM Float32 mono 16kHz
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  const data =
    decoded.numberOfChannels > 1
      ? mixdownMono(decoded)
      : decoded.getChannelData(0);
  audioCtx.close();

  const w = getWorker();

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as TranscribeProgress;
      onProgress(msg);
      if (msg.type === "result") {
        w.removeEventListener("message", handler);
        resolve({ cues: msg.cues, text: msg.text });
      } else if (msg.type === "error") {
        w.removeEventListener("message", handler);
        reject(new Error(msg.message));
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ audio: data, model }, [data.buffer]);
  });
}

function mixdownMono(audio: AudioBuffer): Float32Array {
  const length = audio.length;
  const out = new Float32Array(length);
  const channels = audio.numberOfChannels;
  for (let c = 0; c < channels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += ch[i] / channels;
  }
  return out;
}
