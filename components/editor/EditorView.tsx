"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Save,
  Scissors,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Loader2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { useStore } from "@/lib/store";
import { loadVideoBlob, saveVideoBlob } from "@/lib/db";
import VideoPlayer from "@/components/player/VideoPlayer";
import { formatDuration } from "@/lib/utils";
import { transcribeBlob } from "@/lib/transcribe";
import { trimVideo } from "@/lib/ffmpeg";
import { cuesToSRT, cuesToTXT, cuesToVTT, downloadFile } from "@/lib/captions";

export default function EditorView({ id }: { id: string }) {
  const recording = useStore((s) => s.recordings.find((r) => r.id === id));
  const updateRecording = useStore((s) => s.updateRecording);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState(recording?.title ?? "");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(recording?.durationSec ?? 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording?.durationSec ?? 0);

  const [transcribing, setTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<string>("");
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [cues, setCues] = useState(recording?.captions ?? []);
  const [chapters, setChapters] = useState(recording?.chapters ?? []);

  const [trimming, setTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  const waveRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regions = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);

  // Load video
  useEffect(() => {
    if (!recording) return;
    let revoke: string | null = null;
    (async () => {
      const blob = await loadVideoBlob(recording.id);
      if (blob) {
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        revoke = url;
        setVideoUrl(url);
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [recording]);

  // Init waveform
  useEffect(() => {
    if (!waveRef.current || !videoUrl) return;
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }
    const regionsPlugin = RegionsPlugin.create();
    regions.current = regionsPlugin;
    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor: "#c7d2fe",
      progressColor: "#3340e6",
      cursorColor: "#0b0f19",
      height: 72,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      url: videoUrl,
      plugins: [regionsPlugin],
    });
    wavesurfer.current = ws;
    ws.on("ready", () => {
      const d = ws.getDuration();
      setDuration(d);
      if (!trimEnd || trimEnd > d) setTrimEnd(d);
      regionsPlugin.addRegion({
        id: "trim",
        start: trimStart,
        end: trimEnd || d,
        color: "rgba(51, 64, 230, 0.15)",
        drag: true,
        resize: true,
      });
    });
    regionsPlugin.on("region-updated", (region) => {
      setTrimStart(region.start);
      setTrimEnd(region.end);
    });
    return () => {
      ws.destroy();
      wavesurfer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  const canTrim = useMemo(
    () => trimStart > 0 || (duration > 0 && Math.abs(trimEnd - duration) > 0.1),
    [trimStart, trimEnd, duration]
  );

  async function handleTranscribe() {
    if (!videoBlob || !recording) return;
    setTranscribing(true);
    setTranscribeStatus("Loading model…");
    setTranscribeProgress(0);
    try {
      const result = await transcribeBlob(videoBlob, (p) => {
        if (p.type === "download") {
          setTranscribeStatus(`Downloading ${p.name}`);
          setTranscribeProgress(p.progress);
        } else if (p.type === "loading") {
          setTranscribeStatus(p.message);
        } else if (p.type === "transcribing") {
          setTranscribeStatus("Transcribing audio…");
          setTranscribeProgress(p.progress * 100);
        }
      });
      setCues(result.cues);
      updateRecording(recording.id, { captions: result.cues });
      toast.success(`Transcribed ${result.cues.length} cues`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Transcription failed: ${e.message ?? "unknown"}`);
    } finally {
      setTranscribing(false);
      setTranscribeStatus("");
    }
  }

  async function handleTrim() {
    if (!videoBlob || !recording) return;
    setTrimming(true);
    setTrimProgress(0);
    try {
      const out = await trimVideo(videoBlob, trimStart, trimEnd, (r) =>
        setTrimProgress(r)
      );
      await saveVideoBlob(recording.id, out);
      const newDuration = trimEnd - trimStart;
      updateRecording(recording.id, {
        durationSec: newDuration,
        sizeBytes: out.size,
        trim: { start: trimStart, end: trimEnd },
      });
      setVideoBlob(out);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(out);
      });
      setTrimStart(0);
      setTrimEnd(newDuration);
      toast.success("Trim applied");
    } catch (e: any) {
      console.error(e);
      toast.error(`Trim failed: ${e.message ?? "unknown"}`);
    } finally {
      setTrimming(false);
      setTrimProgress(0);
    }
  }

  function saveTitle() {
    if (!recording) return;
    updateRecording(recording.id, { title: title || recording.title });
    toast.success("Saved");
  }

  function addChapter() {
    const title = prompt("Chapter title?");
    if (!title) return;
    const next = [...chapters, { start: currentTime, title }].sort(
      (a, b) => a.start - b.start
    );
    setChapters(next);
    if (recording) updateRecording(recording.id, { chapters: next });
  }

  function removeChapter(i: number) {
    const next = chapters.filter((_, idx) => idx !== i);
    setChapters(next);
    if (recording) updateRecording(recording.id, { chapters: next });
  }

  function updateCue(i: number, patch: Partial<(typeof cues)[number]>) {
    const next = cues.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setCues(next);
    if (recording) updateRecording(recording.id, { captions: next });
  }

  function autoChapters() {
    // Simple auto-chapters: split duration into 4 parts
    if (!duration) return;
    const n = Math.min(5, Math.max(2, Math.floor(duration / 30)));
    const auto = Array.from({ length: n }, (_, i) => ({
      start: (duration * i) / n,
      title: `Chapter ${i + 1}`,
    }));
    setChapters(auto);
    if (recording) updateRecording(recording.id, { chapters: auto });
    toast.success(`Generated ${n} chapters`);
  }

  if (!recording) {
    return (
      <div className="p-10 text-center">
        <p>Recording not found.</p>
        <Link href="/library" className="text-[var(--primary)] underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="size-4" /> Library
        </Link>
        <div className="h-5 w-px bg-[var(--border)]" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="flex-1 min-w-0 h-10 bg-transparent text-lg md:text-xl font-bold outline-none rounded px-2 focus:bg-white"
        />
        <Link
          href={`/watch/${recording.shareId}`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-[var(--border)] text-sm font-semibold"
        >
          Preview
        </Link>
        <button
          onClick={saveTitle}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
        >
          <Save className="size-4" /> Save
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div>
          <div className="rounded-2xl overflow-hidden bg-black">
            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                poster={recording.thumbnailDataUrl}
                captions={cues}
                chapters={chapters}
                onTime={(t, d) => {
                  setCurrentTime(t);
                  if (d) setDuration(d);
                }}
                className="w-full"
              />
            ) : (
              <div className="aspect-video grid place-items-center text-white/60 text-sm">
                Loading…
              </div>
            )}
          </div>

          {/* Waveform + trim */}
          <div className="mt-4 bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Scissors className="size-4" /> Trim
              </div>
              <div className="text-xs text-zinc-500 tabular-nums">
                {formatDuration(trimStart)} → {formatDuration(trimEnd)}
              </div>
            </div>
            <div ref={waveRef} className="w-full" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs text-zinc-500">Start</label>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimStart.toFixed(1)}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(trimEnd - 0.1, parseFloat(e.target.value) || 0));
                    setTrimStart(v);
                    regions.current?.getRegions().forEach((r) => {
                      if (r.id === "trim") r.setOptions({ start: v });
                    });
                  }}
                  className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">End</label>
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimEnd.toFixed(1)}
                  onChange={(e) => {
                    const v = Math.max(trimStart + 0.1, Math.min(duration, parseFloat(e.target.value) || duration));
                    setTrimEnd(v);
                    regions.current?.getRegions().forEach((r) => {
                      if (r.id === "trim") r.setOptions({ end: v });
                    });
                  }}
                  className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleTrim}
                disabled={!canTrim || trimming}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
              >
                {trimming ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing {Math.round(trimProgress * 100)}%
                  </>
                ) : (
                  <>
                    <Scissors className="size-4" /> Apply trim
                  </>
                )}
              </button>
              <div className="text-xs text-zinc-500">
                Runs FFmpeg in your browser via WebAssembly.
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <aside className="space-y-4">
          {/* Transcript */}
          <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm flex items-center gap-2">
                <FileText className="size-4" /> Transcript
              </div>
              <div className="flex items-center gap-1">
                {cues.length > 0 && (
                  <>
                    <button
                      onClick={() =>
                        downloadFile(cuesToSRT(cues), `${recording.title}.srt`)
                      }
                      className="h-8 px-2.5 rounded-full border border-[var(--border)] text-xs"
                      title="Download SRT"
                    >
                      SRT
                    </button>
                    <button
                      onClick={() =>
                        downloadFile(cuesToVTT(cues), `${recording.title}.vtt`)
                      }
                      className="h-8 px-2.5 rounded-full border border-[var(--border)] text-xs"
                      title="Download VTT"
                    >
                      VTT
                    </button>
                    <button
                      onClick={() =>
                        downloadFile(cuesToTXT(cues), `${recording.title}.txt`)
                      }
                      className="h-8 px-2.5 rounded-full border border-[var(--border)] text-xs"
                      title="Download TXT"
                    >
                      TXT
                    </button>
                  </>
                )}
              </div>
            </div>
            {cues.length === 0 && !transcribing && (
              <button
                onClick={handleTranscribe}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
              >
                <Sparkles className="size-4" />
                Auto-generate transcript
              </button>
            )}
            {transcribing && (
              <div className="text-sm">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Loader2 className="size-4 animate-spin" />
                  {transcribeStatus || "Working…"}
                </div>
                <div className="mt-2 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] transition-all"
                    style={{ width: `${Math.min(100, transcribeProgress)}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  Whisper runs entirely in your browser. First run downloads
                  ~75&nbsp;MB from Hugging Face — cached afterward.
                </p>
              </div>
            )}
            {cues.length > 0 && (
              <div className="max-h-[400px] overflow-auto scrollbar-thin pr-2 space-y-1">
                {cues.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg hover:bg-[var(--muted)] px-2 py-1.5"
                  >
                    <div className="text-[10px] tabular-nums text-zinc-400 mb-0.5">
                      {formatDuration(c.start)} — {formatDuration(c.end)}
                    </div>
                    <textarea
                      value={c.text}
                      onChange={(e) => updateCue(i, { text: e.target.value })}
                      rows={2}
                      className="w-full resize-none text-sm bg-transparent outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Chapters */}
          <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Wand2 className="size-4" /> Chapters
              </div>
              <div className="flex gap-1">
                <button
                  onClick={autoChapters}
                  className="h-8 px-3 rounded-full border border-[var(--border)] text-xs"
                >
                  Auto
                </button>
                <button
                  onClick={addChapter}
                  className="h-8 px-3 rounded-full bg-[var(--primary)] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add
                </button>
              </div>
            </div>
            {chapters.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No chapters yet. Click{" "}
                <span className="font-semibold">Auto</span> or{" "}
                <span className="font-semibold">Add</span> at the current time.
              </p>
            ) : (
              <ul className="space-y-1">
                {chapters.map((ch, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg hover:bg-[var(--muted)] px-2 py-1.5"
                  >
                    <span className="text-[11px] tabular-nums text-zinc-500 w-12">
                      {formatDuration(ch.start)}
                    </span>
                    <input
                      value={ch.title}
                      onChange={(e) => {
                        const next = chapters.map((c, idx) =>
                          idx === i ? { ...c, title: e.target.value } : c
                        );
                        setChapters(next);
                        updateRecording(recording.id, { chapters: next });
                      }}
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                    <button
                      onClick={() => removeChapter(i)}
                      className="size-7 grid place-items-center rounded-full hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {videoUrl && (
            <a
              href={videoUrl}
              download={`${recording.title.replace(/\s+/g, "_")}.webm`}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-white border border-[var(--border)] text-sm font-semibold"
            >
              <Download className="size-4" /> Download video
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
