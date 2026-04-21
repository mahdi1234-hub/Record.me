"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Download,
  Heart,
  MessageSquare,
  Pencil,
  Share2,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { loadVideoBlob } from "@/lib/db";
import { remuxForDownload } from "@/lib/ffmpeg";
import VideoPlayer from "@/components/player/VideoPlayer";
import { formatDuration, formatRelative } from "@/lib/utils";
import ShareModal from "@/components/ShareModal";

export default function WatchView({ shareId }: { shareId: string }) {
  const getByShareId = useStore((s) => s.getByShareId);
  const trackView = useStore((s) => s.trackView);
  const trackEvent = useStore((s) => s.trackEvent);
  const recording = useStore((s) =>
    s.recordings.find((r) => r.shareId === shareId)
  );

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const viewTrackedRef = useRef(false);
  const lastProgressRef = useRef(0);
  const [activeTab, setActiveTab] = useState<"transcript" | "chapters" | "comments">(
    "transcript"
  );
  const [comments, setComments] = useState<
    { id: string; text: string; time: number; at: number }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (!recording) return;
    let revoke: string | null = null;
    (async () => {
      const blob = await loadVideoBlob(recording.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setVideoUrl(url);
      }
    })();
    if (!viewTrackedRef.current) {
      trackView(recording.id);
      viewTrackedRef.current = true;
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [recording, trackView]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !recording) return "";
    return `${window.location.origin}/watch/${recording.shareId}`;
  }, [recording]);

  if (!recording) {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold">Recording not found</h1>
          <p className="text-zinc-500 mt-2 text-sm">
            This share link is invalid or the recording was deleted on this
            device. Recordings are stored locally in your browser.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-10 px-4 mt-5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="h-[60px] bg-slate-900 text-white flex items-center px-4 md:px-6 gap-3">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Library
        </Link>
        <div className="h-5 w-px bg-white/20" />
        <div className="font-semibold truncate min-w-0 flex-1">{recording.title}</div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/analytics/${recording.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-sm"
          >
            <BarChart3 className="size-4" /> Analytics
          </Link>
          <Link
            href={`/edit/${recording.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-sm"
          >
            <Pencil className="size-4" /> Edit
          </Link>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--primary)] hover:opacity-95 text-sm font-semibold"
          >
            <Share2 className="size-4" /> Share
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <div className="rounded-2xl overflow-hidden shadow-xl">
            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                poster={recording.thumbnailDataUrl}
                captions={recording.captions}
                chapters={recording.chapters}
                heatmap={recording.analytics.heatmap}
                onTime={(t) => {
                  setCurrentTime(t);
                  if (t - lastProgressRef.current >= 1) {
                    lastProgressRef.current = t;
                    trackEvent(recording.id, { type: "progress", position: t });
                  }
                }}
                onPlay={() =>
                  trackEvent(recording.id, { type: "play", position: currentTime })
                }
                onPause={() =>
                  trackEvent(recording.id, { type: "pause", position: currentTime })
                }
                onSeek={(t) =>
                  trackEvent(recording.id, { type: "seek", position: t })
                }
                onEnded={() =>
                  trackEvent(recording.id, { type: "complete", position: currentTime })
                }
                className="w-full"
              />
            ) : (
              <div className="aspect-video bg-slate-900 grid place-items-center text-white/60 text-sm">
                Loading video…
              </div>
            )}
          </div>

          <div className="mt-4 text-white flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{recording.title}</h1>
              <div className="text-white/60 text-sm mt-1">
                {recording.analytics.views} view
                {recording.analytics.views === 1 ? "" : "s"} ·{" "}
                {formatRelative(recording.createdAt)} ·{" "}
                {formatDuration(recording.durationSec)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 text-white text-sm">
                <Heart className="size-4" /> Like
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied to clipboard");
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 text-white text-sm"
              >
                <Copy className="size-4" /> Copy link
              </button>
              <button
                disabled={downloading}
                onClick={async () => {
                  if (!recording) return;
                  try {
                    setDownloading(true);
                    setDownloadProgress(0);
                    const src = await loadVideoBlob(recording.id);
                    if (!src) {
                      toast.error("Recording file not found on this device.");
                      return;
                    }
                    const { blob, extension } = await remuxForDownload(
                      src,
                      (r) => setDownloadProgress(Math.round(r * 100)),
                      recording.durationSec
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${recording.title.replace(/\s+/g, "_")}.${extension}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    toast.success("Download ready.");
                  } catch (e) {
                    console.error("download failed", e);
                    toast.error("Could not prepare download.");
                  } finally {
                    setDownloading(false);
                    setDownloadProgress(0);
                  }
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-sm"
              >
                <Download className="size-4" />
                {downloading
                  ? `Preparing… ${downloadProgress}%`
                  : "Download"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="bg-slate-900 text-white rounded-2xl p-4 h-fit max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex gap-1 text-sm border-b border-white/10 mb-3">
            {(["transcript", "chapters", "comments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={
                  "px-3 py-2 capitalize " +
                  (activeTab === t
                    ? "border-b-2 border-white font-semibold"
                    : "text-white/60")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === "transcript" && (
            <div className="overflow-auto scrollbar-thin pr-2 space-y-1 text-sm">
              {recording.captions && recording.captions.length > 0 ? (
                recording.captions.map((c, i) => {
                  const active = currentTime >= c.start && currentTime <= c.end;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const video = document.querySelector("video");
                        if (video) video.currentTime = c.start;
                      }}
                      className={
                        "w-full text-left rounded-lg px-3 py-2 transition " +
                        (active
                          ? "bg-[var(--primary)]/30 text-white"
                          : "hover:bg-white/5 text-white/85")
                      }
                    >
                      <div className="text-[11px] tabular-nums text-white/50 mb-0.5">
                        {formatDuration(c.start)}
                      </div>
                      {c.text}
                    </button>
                  );
                })
              ) : recording.transcribing ? (
                <div className="text-white/60 text-sm text-center py-8">
                  <div className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--primary)] animate-pulse" />
                    Generating transcript in the background…
                  </div>
                  <p className="text-[11px] text-white/40 mt-2">
                    First run downloads the Whisper model (~75&nbsp;MB). Cached afterward.
                  </p>
                </div>
              ) : (
                <div className="text-white/50 text-sm text-center py-8">
                  <p>No transcript yet.</p>
                  <Link
                    href={`/edit/${recording.id}`}
                    className="inline-flex items-center gap-1.5 h-9 px-4 mt-4 rounded-full bg-white text-slate-900 text-sm font-semibold"
                  >
                    Generate transcript
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "chapters" && (
            <div className="overflow-auto scrollbar-thin pr-2 space-y-1 text-sm">
              {recording.chapters && recording.chapters.length > 0 ? (
                recording.chapters.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const video = document.querySelector("video");
                      if (video) video.currentTime = ch.start;
                    }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-white/5"
                  >
                    <div className="text-[11px] tabular-nums text-white/50">
                      {formatDuration(ch.start)}
                    </div>
                    <div className="font-medium">{ch.title}</div>
                  </button>
                ))
              ) : recording.transcribing ? (
                <div className="text-white/60 text-sm text-center py-8 inline-flex items-center gap-2 justify-center w-full">
                  <span className="size-2 rounded-full bg-[var(--primary)] animate-pulse" />
                  Generating chapters…
                </div>
              ) : (
                <div className="text-white/50 text-sm text-center py-8">
                  No chapters yet. Add them from the editor.
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="flex flex-col flex-1">
              <div className="flex-1 overflow-auto scrollbar-thin pr-2 space-y-2 text-sm">
                {comments.length === 0 ? (
                  <div className="text-white/50 text-sm text-center py-8">
                    Be the first to leave a comment.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg bg-white/5 px-3 py-2"
                    >
                      <div className="text-[11px] text-white/50">
                        at {formatDuration(c.time)}
                      </div>
                      <div>{c.text}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`Comment at ${formatDuration(currentTime)}`}
                  className="flex-1 h-10 rounded-full bg-white/10 text-white placeholder:text-white/50 px-4 outline-none focus:bg-white/15 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      setComments((c) => [
                        ...c,
                        {
                          id: Math.random().toString(36).slice(2),
                          text: newComment.trim(),
                          time: currentTime,
                          at: Date.now(),
                        },
                      ]);
                      setNewComment("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newComment.trim()) {
                      setComments((c) => [
                        ...c,
                        {
                          id: Math.random().toString(36).slice(2),
                          text: newComment.trim(),
                          time: currentTime,
                          at: Date.now(),
                        },
                      ]);
                      setNewComment("");
                    }
                  }}
                  className="h-10 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {shareOpen && (
        <ShareModal
          url={shareUrl}
          title={recording.title}
          shareId={recording.shareId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
