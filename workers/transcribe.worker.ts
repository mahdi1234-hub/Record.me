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

    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: "english",
      task: "transcribe",
    });

    const chunks: { text: string; timestamp: [number, number] }[] =
      output.chunks ?? [];
    const cues = chunks
      .filter((c) => c.timestamp && c.timestamp[0] != null)
      .map((c) => ({
        start: c.timestamp[0],
        end: c.timestamp[1] ?? c.timestamp[0] + 2,
        text: c.text.trim(),
      }))
      .filter((c) => c.text.length > 0);

    self.postMessage({ type: "result", cues, text: output.text ?? "" });
  } catch (err: any) {
    console.error(err);
    self.postMessage({ type: "error", message: err?.message ?? "Unknown error" });
  }
});

export {};
