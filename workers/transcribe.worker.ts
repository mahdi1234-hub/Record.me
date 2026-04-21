/// <reference lib="webworker" />

import { pipeline, env } from "@xenova/transformers";

// Use HuggingFace CDN, no local model
env.allowLocalModels = false;
env.useBrowserCache = true;

type InMsg = {
  audio: Float32Array;
  model: string;
};

let transcriber: any = null;

self.addEventListener("message", async (e: MessageEvent<InMsg>) => {
  const { audio, model } = e.data;
  try {
    if (!transcriber) {
      transcriber = await pipeline("automatic-speech-recognition", model, {
        progress_callback: (p: any) => {
          if (p.status === "progress") {
            self.postMessage({
              type: "download",
              name: p.file,
              progress: p.progress ?? 0,
            });
          } else if (p.status === "ready" || p.status === "done") {
            self.postMessage({ type: "loading", message: "Ready" });
          } else {
            self.postMessage({ type: "loading", message: p.status });
          }
        },
      });
    }

    self.postMessage({ type: "transcribing", progress: 0 });

    let output: any;
    try {
      output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: "word",
        language: "english",
        task: "transcribe",
      });
    } catch (wordErr) {
      // Some Whisper variants don't support word-level timestamps; fall back to segment.
      console.warn("word timestamps failed, falling back to segments", wordErr);
      output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        language: "english",
        task: "transcribe",
      });
    }

    const chunks: { text: string; timestamp: [number, number] }[] =
      output.chunks ?? [];
    const raw = chunks.filter((c) => c.timestamp && c.timestamp[0] != null);

    // If word-level chunks, group into ~7-word phrases for readable cues.
    const isWordLevel =
      raw.length > 0 && raw.every((c) => c.text.trim().split(/\s+/).length <= 2);

    let cues: { start: number; end: number; text: string }[];
    if (isWordLevel) {
      const groupSize = 7;
      cues = [];
      for (let i = 0; i < raw.length; i += groupSize) {
        const group = raw.slice(i, i + groupSize);
        const text = group
          .map((c) => c.text)
          .join("")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) continue;
        cues.push({
          start: group[0].timestamp[0],
          end: group[group.length - 1].timestamp[1] ?? group[0].timestamp[0] + 2,
          text,
        });
      }
    } else {
      cues = raw
        .map((c) => ({
          start: c.timestamp[0],
          end: c.timestamp[1] ?? c.timestamp[0] + 2,
          text: c.text.trim(),
        }))
        .filter((c) => c.text.length > 0);
    }

    self.postMessage({ type: "result", cues, text: output.text ?? "" });
  } catch (err: any) {
    console.error(err);
    self.postMessage({ type: "error", message: err?.message ?? "Unknown error" });
  }
});

export {};
