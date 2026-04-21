"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "@/components/player/VideoPlayer";
import { loadVideoBlob } from "@/lib/db";
import { useStore } from "@/lib/store";
import { fetchCloudRecording, type CloudRecording } from "@/lib/cloud";
import type { CaptionCue } from "@/lib/store";

type EmbedData = {
  title: string;
  videoSrc: string;
  captions?: CaptionCue[];
  chapters?: { title: string; start: number }[];
};

export default function EmbedView({ shareId }: { shareId: string }) {
  const localRecording = useStore((s) =>
    s.recordings.find((r) => r.shareId === shareId)
  );

  const [data, setData] = useState<EmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      // 1) Try cloud first — works on any domain / any browser.
      const cloud = await fetchCloudRecording(shareId);
      if (cloud?.videoUrl) {
        setData({
          title: cloud.title,
          videoSrc: cloud.videoUrl,
          captions: cloud.captions,
          chapters: cloud.chapters,
        });
        return;
      }

      // 2) Fall back to local IndexedDB (same-browser only).
      if (localRecording) {
        const blob = await loadVideoBlob(localRecording.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          revoke = url;
          setData({
            title: localRecording.title,
            videoSrc: url,
            captions: localRecording.captions,
            chapters: localRecording.chapters,
          });
          return;
        }
      }

      setError(
        "This recording isn't available on the cloud yet. Ask the creator to re-open the recording so it can sync."
      );
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [shareId, localRecording]);

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center">
      {data ? (
        <VideoPlayer
          src={data.videoSrc}
          captions={data.captions}
          chapters={data.chapters}
          className="w-full h-full"
          autoPlay={false}
        />
      ) : error ? (
        <div className="text-white/80 text-sm max-w-md text-center p-6">
          {error}
        </div>
      ) : (
        <div className="text-white/60 text-sm">Loading…</div>
      )}
    </div>
  );
}
