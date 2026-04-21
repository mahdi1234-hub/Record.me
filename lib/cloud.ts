"use client";

import { upload } from "@vercel/blob/client";

export type CloudRecording = {
  shareId: string;
  title: string;
  createdAt: number;
  durationSec: number;
  mode: string;
  videoUrl: string;
  thumbnailUrl?: string;
  captions?: { start: number; end: number; text: string }[];
  chapters?: { title: string; start: number }[];
  savedAt: number;
};

/**
 * Upload a video blob + metadata to Vercel Blob so the recording can be
 * embedded from any website. Best-effort: if the server isn't configured
 * with BLOB_READ_WRITE_TOKEN, this function swallows the error so the
 * local experience keeps working.
 */
export async function uploadRecordingToCloud(args: {
  shareId: string;
  title: string;
  createdAt: number;
  durationSec: number;
  mode: string;
  videoBlob: Blob;
  captions?: { start: number; end: number; text: string }[];
  chapters?: { title: string; start: number }[];
  onProgress?: (pct: number) => void;
}): Promise<CloudRecording | null> {
  try {
    const ext = args.videoBlob.type.includes("mp4") ? "mp4" : "webm";
    const videoPath = `videos/${args.shareId}.${ext}`;
    const videoResult = await upload(videoPath, args.videoBlob, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      contentType: args.videoBlob.type || "video/webm",
      onUploadProgress: (p) => {
        if (args.onProgress && typeof p.percentage === "number") {
          args.onProgress(p.percentage);
        }
      },
    });

    const meta = {
      title: args.title,
      createdAt: args.createdAt,
      durationSec: args.durationSec,
      mode: args.mode,
      videoUrl: videoResult.url,
      captions: args.captions,
      chapters: args.chapters,
    };
    const res = await fetch(`/api/recordings/${args.shareId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
    if (!res.ok) {
      if (res.status === 503) return null; // cloud not configured
      throw new Error(`metadata upload failed: ${res.status}`);
    }
    return {
      ...meta,
      shareId: args.shareId,
      savedAt: Date.now(),
    };
  } catch (e) {
    console.warn("cloud upload failed (local-only fallback):", e);
    return null;
  }
}

export async function fetchCloudRecording(
  shareId: string
): Promise<CloudRecording | null> {
  try {
    const res = await fetch(`/api/recordings/${shareId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CloudRecording;
  } catch {
    return null;
  }
}
