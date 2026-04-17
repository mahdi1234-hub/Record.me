"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Captions,
  Settings2,
  PictureInPicture,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { CaptionCue } from "@/lib/store";

export type VideoPlayerProps = {
  src: string;
  poster?: string;
  captions?: CaptionCue[];
  chapters?: { title: string; start: number }[];
  onTime?: (time: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
  heatmap?: number[]; // length 100
};

export default function VideoPlayer({
  src,
  poster,
  captions,
  chapters,
  onTime,
  onPlay,
  onPause,
  onSeek,
  onEnded,
  className,
  autoPlay,
  heatmap,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [hovering, setHovering] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const currentCue = captions?.find((c) => time >= c.start && time <= c.end);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      setTime(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
      onTime?.(v.currentTime, v.duration || 0);
    };
    const onLoaded = () => setDuration(v.duration || 0);
    const onPlayEv = () => {
      setPlaying(true);
      onPlay?.();
    };
    const onPauseEv = () => {
      setPlaying(false);
      onPause?.();
    };
    const onEndedEv = () => {
      setPlaying(false);
      onEnded?.();
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("durationchange", onLoaded);
    v.addEventListener("play", onPlayEv);
    v.addEventListener("pause", onPauseEv);
    v.addEventListener("ended", onEndedEv);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("durationchange", onLoaded);
      v.removeEventListener("play", onPlayEv);
      v.removeEventListener("pause", onPauseEv);
      v.removeEventListener("ended", onEndedEv);
    };
  }, [onTime, onPlay, onPause, onEnded]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const v = videoRef.current;
      if (!v) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        v.paused ? v.play() : v.pause();
      } else if (e.key === "ArrowLeft") {
        v.currentTime = Math.max(0, v.currentTime - 5);
        onSeek?.(v.currentTime);
      } else if (e.key === "ArrowRight") {
        v.currentTime = Math.min(v.duration, v.currentTime + 5);
        onSeek?.(v.currentTime);
      } else if (e.key === "m") {
        v.muted = !v.muted;
        setMuted(v.muted);
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "c") {
        setShowCaptions((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSeek]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }

  function seek(to: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, to));
    onSeek?.(v.currentTime);
  }

  function changeSpeed(s: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  }

  async function togglePiP() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {}
  }

  const progress = duration ? (time / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-2xl overflow-hidden group",
        className
      )}
      onMouseMove={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        onClick={togglePlay}
        className="w-full h-full aspect-video object-contain bg-black cursor-pointer"
      />

      {/* Captions overlay */}
      {showCaptions && currentCue && (
        <div className="absolute left-0 right-0 bottom-20 flex justify-center pointer-events-none px-6">
          <div className="bg-black/70 backdrop-blur text-white text-lg md:text-xl font-medium px-4 py-2 rounded-md text-center max-w-3xl">
            {currentCue.text}
          </div>
        </div>
      )}

      {/* Center play button when paused */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center"
          aria-label="Play"
        >
          <span className="size-20 rounded-full bg-white/90 text-slate-900 grid place-items-center shadow-2xl">
            <Play className="size-8 ml-1" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 p-3 md:p-4 transition-opacity",
          hovering || !playing ? "opacity-100" : "opacity-0"
        )}
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0) 100%)",
        }}
      >
        {/* Progress bar + heatmap */}
        <div
          className="relative h-8 -mb-2 group/bar"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setHoverTime(Math.max(0, Math.min(1, pct)) * duration);
          }}
          onMouseLeave={() => setHoverTime(null)}
        >
          {heatmap && heatmap.some((v) => v > 0) && (
            <div className="absolute inset-x-0 bottom-4 h-2 flex gap-px rounded overflow-hidden pointer-events-none">
              {(() => {
                const max = Math.max(...heatmap);
                return heatmap.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{
                      background: `rgba(255,255,255,${max ? (v / max) * 0.7 + 0.1 : 0.1})`,
                    }}
                  />
                ));
              })()}
            </div>
          )}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={time}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-x-0 bottom-0 w-full h-4 cursor-pointer opacity-0 z-10"
          />
          <div className="absolute inset-x-0 bottom-1 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-white/40"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[var(--primary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Chapters markers */}
          {chapters?.map((ch, i) => (
            <div
              key={i}
              className="absolute bottom-0 h-4 w-0.5 bg-white/60"
              style={{
                left: `${duration ? (ch.start / duration) * 100 : 0}%`,
              }}
              title={ch.title}
            />
          ))}
          {/* Hover tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-0.5 rounded"
              style={{ left: `${duration ? (hoverTime / duration) * 100 : 0}%` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 text-white">
          <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full">
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button
            onClick={() => seek(time - 10)}
            className="p-2 hover:bg-white/10 rounded-full"
            aria-label="Back 10s"
          >
            <SkipBack className="size-5" />
          </button>
          <button
            onClick={() => seek(time + 10)}
            className="p-2 hover:bg-white/10 rounded-full"
            aria-label="Forward 10s"
          >
            <SkipForward className="size-5" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                }
              }}
              className="w-20 accent-white"
            />
          </div>
          <div className="tabular-nums text-sm ml-2">
            {formatDuration(time)} / {formatDuration(duration)}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {captions && captions.length > 0 && (
              <button
                onClick={() => setShowCaptions((s) => !s)}
                className={cn(
                  "p-2 hover:bg-white/10 rounded-full",
                  showCaptions ? "text-white" : "text-white/50"
                )}
                aria-label="Toggle captions"
              >
                <Captions className="size-5" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <Settings2 className="size-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-12 right-0 w-40 bg-black/90 text-white rounded-lg p-2 text-sm">
                  <div className="px-2 py-1 text-white/60 text-xs">Playback speed</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded hover:bg-white/10",
                        speed === s && "bg-white/10"
                      )}
                    >
                      {s === 1 ? "Normal" : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={togglePiP}
              className="p-2 hover:bg-white/10 rounded-full"
              aria-label="Picture in picture"
            >
              <PictureInPicture className="size-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              {fullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Chapter list */}
        {chapters && chapters.length > 0 && (
          <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-thin">
            {chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => seek(ch.start)}
                className="shrink-0 text-xs text-white/80 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1"
              >
                {formatDuration(ch.start)} · {ch.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
