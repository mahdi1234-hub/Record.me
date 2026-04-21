"use client";

import "regenerator-runtime/runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Rnd } from "react-rnd";
import {
  Monitor,
  Camera,
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Video as VideoIcon,
  X,
  ChevronLeft,
  Loader2,
  Captions as CaptionsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import fixWebmDuration from "fix-webm-duration";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useStore } from "@/lib/store";
import { saveVideoBlob } from "@/lib/db";
import { formatDuration, cn } from "@/lib/utils";
import { transcribeBlob } from "@/lib/transcribe";
import { cuesToChapters } from "@/lib/chapters";
import Link from "next/link";

type Mode = "screen-camera" | "screen" | "camera" | "audio";

export default function RecordingStudio() {
  const router = useRouter();
  const addRecording = useStore((s) => s.addRecording);

  const [mode, setMode] = useState<Mode>("screen-camera");
  const [mic, setMic] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState<"idle" | "recording" | "paused" | "stopped">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [liveCaptions, setLiveCaptions] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState("");
  const [transcribeProgress, setTranscribeProgress] = useState(0);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const composerVideosRef = useRef<HTMLVideoElement[]>([]);

  // Bubble position/size
  const [bubble, setBubble] = useState({ x: 24, y: 24, w: 220, h: 220 });

  // Populate devices
  useEffect(() => {
    (async () => {
      try {
        // Need one prior permission to get labels
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list);
        const cam = list.find((d) => d.kind === "videoinput");
        const m = list.find((d) => d.kind === "audioinput");
        if (cam) setSelectedCamId(cam.deviceId);
        if (m) setSelectedMicId(m.deviceId);
        if (s) s.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Preview camera when idle and cameraOn
  useEffect(() => {
    if (status !== "idle") return;
    let cancelled = false;
    (async () => {
      try {
        if (cameraOn && (mode === "camera" || mode === "screen-camera")) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: selectedCamId ? { deviceId: { exact: selectedCamId } } : true,
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          cameraStreamRef.current = stream;
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
            await cameraVideoRef.current.play().catch(() => {});
          }
        } else {
          cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
          cameraStreamRef.current = null;
          if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
        }
      } catch (e) {
        console.error("camera preview failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraOn, mode, selectedCamId, status]);

  const stopAllStreams = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    micStreamRef.current = null;
    composerVideosRef.current.forEach((v) => {
      try {
        v.pause();
        v.srcObject = null;
      } catch {}
    });
    composerVideosRef.current = [];
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAllStreams();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [stopAllStreams]);

  async function acquireStreams(): Promise<MediaStream> {
    // Screen
    if (mode === "screen" || mode === "screen-camera") {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      screenStreamRef.current = screen;
      screen.getVideoTracks()[0].addEventListener("ended", () => stop());
    }
    // Camera
    if (mode === "camera" || mode === "screen-camera") {
      const cam =
        cameraStreamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          video: selectedCamId ? { deviceId: { exact: selectedCamId } } : true,
          audio: false,
        }));
      cameraStreamRef.current = cam;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cam;
        await cameraVideoRef.current.play().catch(() => {});
      }
    }
    // Mic
    if (mic || mode === "audio") {
      const mic$ = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        video: false,
      });
      micStreamRef.current = mic$;
    }

    // Build composite stream
    if (mode === "audio") {
      return micStreamRef.current!;
    }

    if (mode === "camera") {
      const cam = cameraStreamRef.current!;
      const out = new MediaStream();
      cam.getVideoTracks().forEach((t) => out.addTrack(t));
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => out.addTrack(t));
      }
      return out;
    }

    if (mode === "screen") {
      const screen = screenStreamRef.current!;
      const out = new MediaStream();
      screen.getVideoTracks().forEach((t) => out.addTrack(t));
      // Combine screen audio + mic if both
      const audioTracks: MediaStreamTrack[] = [];
      screen.getAudioTracks().forEach((t) => audioTracks.push(t));
      micStreamRef.current?.getAudioTracks().forEach((t) => audioTracks.push(t));
      if (audioTracks.length === 1) {
        out.addTrack(audioTracks[0]);
      } else if (audioTracks.length > 1) {
        const mixed = mixAudio(audioTracks);
        mixed.getAudioTracks().forEach((t) => out.addTrack(t));
      }
      return out;
    }

    // screen-camera: compose via canvas
    return composeScreenCamera();
  }

  function mixAudio(tracks: MediaStreamTrack[]): MediaStream {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    tracks.forEach((t) => {
      const src = ctx.createMediaStreamSource(new MediaStream([t]));
      src.connect(dest);
    });
    return dest.stream;
  }

  function composeScreenCamera(): MediaStream {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Use detached video elements for the compositor so we don't depend on the
    // conditionally-rendered preview <video> nodes (they don't exist until
    // `status !== "idle"`, which happens AFTER this function runs).
    const screenVideo = document.createElement("video");
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.srcObject = screenStreamRef.current!;
    screenVideo.play().catch(() => {});
    composerVideosRef.current.push(screenVideo);

    const camVideo = document.createElement("video");
    camVideo.muted = true;
    camVideo.playsInline = true;
    camVideo.srcObject = cameraStreamRef.current!;
    camVideo.play().catch(() => {});
    composerVideosRef.current.push(camVideo);

    // Also mirror the screen stream into the preview <video> when it mounts.
    const attachPreview = () => {
      if (screenVideoRef.current && !screenVideoRef.current.srcObject) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
        screenVideoRef.current.play().catch(() => {});
      }
    };
    attachPreview();
    const previewInterval = window.setInterval(attachPreview, 150);
    window.setTimeout(() => window.clearInterval(previewInterval), 3000);

    // Resolution: base on screen track settings
    const track = screenStreamRef.current!.getVideoTracks()[0];
    const settings = track.getSettings();
    canvas.width = settings.width ?? 1280;
    canvas.height = settings.height ?? 720;

    let raf = 0;
    const draw = () => {
      if (screenVideo.readyState >= 2) {
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Camera bubble
      if (cameraOn && camVideo.readyState >= 2) {
        const size = Math.min(canvas.width, canvas.height) * 0.22;
        // Map bubble position (from CSS preview) to canvas coordinates
        const previewRect = canvasPreviewRef.current?.getBoundingClientRect();
        let relX = 0.04;
        let relY = 0.04;
        if (previewRect) {
          relX = bubble.x / previewRect.width;
          relY = bubble.y / previewRect.height;
        }
        const cx = canvas.width * relX + size / 2;
        const cy = canvas.height * relY + size / 2;
        const r = size / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        // cover the circle with camera video
        const vw = camVideo.videoWidth;
        const vh = camVideo.videoHeight;
        const scale = Math.max((2 * r) / vw, (2 * r) / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(camVideo, cx - dw / 2, cy - dh / 2, dw, dh);
        ctx.restore();
        // Ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    rafRef.current = raf;

    const canvasStream = canvas.captureStream(30);

    // Add audio
    const audioTracks: MediaStreamTrack[] = [];
    screenStreamRef.current?.getAudioTracks().forEach((t) => audioTracks.push(t));
    if (mic) micStreamRef.current?.getAudioTracks().forEach((t) => audioTracks.push(t));
    if (audioTracks.length === 1) {
      canvasStream.addTrack(audioTracks[0]);
    } else if (audioTracks.length > 1) {
      const mixed = mixAudio(audioTracks);
      mixed.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
    }

    return canvasStream;
  }

  const canvasPreviewRef = useRef<HTMLDivElement>(null);

  async function start() {
    try {
      setCountdown(3);
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);

      const stream = await acquireStreams();
      chunksRef.current = [];

      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

      const rec = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
        audioBitsPerSecond: 128_000,
      });
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = onRecordingStopped;

      rec.start(1000);
      startTimeRef.current = Date.now();
      setStatus("recording");
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);

      // Kick off live captions
      if (liveCaptions && (mic || mode === "audio") && browserSupportsSpeechRecognition) {
        resetTranscript();
        try {
          await SpeechRecognition.startListening({
            continuous: true,
            interimResults: true,
            language: "en-US",
          });
        } catch (e) {
          console.warn("Could not start live captions", e);
        }
      }

      toast.success("Recording started");
    } catch (e) {
      console.error(e);
      toast.error("Could not start recording. Check permissions.");
      stopAllStreams();
      setStatus("idle");
      setCountdown(null);
    }
  }

  function pause() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      setStatus("paused");
      if (timerRef.current) window.clearInterval(timerRef.current);
    } else if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (listening) {
      SpeechRecognition.stopListening().catch(() => {});
    }
  }

  async function onRecordingStopped() {
    try {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      const mimeType =
        recorderRef.current?.mimeType ?? "video/webm";
      let blob = new Blob(chunksRef.current, { type: mimeType });
      // Fix webm duration metadata
      try {
        blob = await fixWebmDuration(blob, duration * 1000, { logger: false });
      } catch (e) {
        console.warn("fixWebmDuration failed", e);
      }

      const id = nanoid(12);
      await saveVideoBlob(id, blob);

      // Generate thumbnail
      const thumb = await generateThumbnail(blob);

      const title = `Recording — ${new Date().toLocaleString()}`;
      const rec = addRecording({
        id,
        title,
        createdAt: Date.now(),
        durationSec: duration,
        sizeBytes: blob.size,
        mimeType,
        mode,
        thumbnailDataUrl: thumb,
      });

      stopAllStreams();
      setStatus("stopped");
      toast.success("Recording saved. Generating captions & chapters…");

      // Run Whisper on the audio for word-level timestamps, then build chapters.
      // Audio-bearing modes only; camera-only / audio / screen+camera / screen (w/ mic)
      // all have audio in the blob.
      const hasAudio = mic || mode === "audio";
      if (hasAudio) {
        await runTranscription(blob, rec.id);
      }

      router.push(`/watch/${rec.shareId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save recording.");
    }
  }

  async function runTranscription(blob: Blob, recordingId: string) {
    setTranscribing(true);
    setTranscribeStatus("Preparing model…");
    setTranscribeProgress(0);
    try {
      const { cues } = await transcribeBlob(blob, (p) => {
        if (p.type === "download") {
          setTranscribeStatus(`Downloading ${p.name}`);
          setTranscribeProgress(p.progress ?? 0);
        } else if (p.type === "loading") {
          setTranscribeStatus(p.message);
        } else if (p.type === "transcribing") {
          setTranscribeStatus("Transcribing audio…");
          setTranscribeProgress((p.progress ?? 0) * 100);
        }
      });
      const chapters = cuesToChapters(cues);
      useStore
        .getState()
        .updateRecording(recordingId, { captions: cues, chapters });
      toast.success(
        `Transcript ready · ${cues.length} cues · ${chapters.length} chapters`
      );
    } catch (e) {
      console.warn("Auto-transcription failed", e);
      toast.message(
        "Could not auto-generate captions. You can retry from the editor."
      );
    } finally {
      setTranscribing(false);
      setTranscribeStatus("");
      setTranscribeProgress(0);
    }
  }

  async function generateThumbnail(blob: Blob): Promise<string | undefined> {
    try {
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.preload = "metadata";
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject();
      });
      video.currentTime = Math.min(1, video.duration / 3);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = (640 * (video.videoHeight || 9)) / (video.videoWidth || 16);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      return dataUrl;
    } catch {
      return undefined;
    }
  }

  const modes: { id: Mode; label: string; desc: string; Icon: typeof Monitor }[] = [
    {
      id: "screen-camera",
      label: "Screen + Camera",
      desc: "Loom-style recording",
      Icon: Monitor,
    },
    {
      id: "screen",
      label: "Screen only",
      desc: "Capture your display",
      Icon: Monitor,
    },
    { id: "camera", label: "Camera", desc: "Webcam recording", Icon: Camera },
    { id: "audio", label: "Audio only", desc: "Voice note", Icon: Mic },
  ];

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <div className="h-[64px] bg-white border-b border-[var(--border)] flex items-center px-6 gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <div className="h-5 w-px bg-[var(--border)]" />
        <div className="font-semibold">New Recording</div>
        {status === "recording" || status === "paused" ? (
          <div className="ml-auto flex items-center gap-2 text-sm font-medium">
            <span
              className={cn(
                "size-2 rounded-full bg-red-500",
                status === "recording" && "rec-dot"
              )}
            />
            {status === "recording" ? "Recording" : "Paused"} ·{" "}
            <span className="tabular-nums">{formatDuration(elapsed)}</span>
          </div>
        ) : null}
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Mode selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {modes.map((m) => (
            <button
              key={m.id}
              disabled={status !== "idle"}
              onClick={() => setMode(m.id)}
              className={cn(
                "text-left rounded-2xl border p-4 transition",
                mode === m.id
                  ? "border-[var(--primary)] bg-[var(--accent)]"
                  : "bg-white border-[var(--border)] hover:border-zinc-300",
                status !== "idle" && "opacity-60 cursor-not-allowed"
              )}
            >
              <m.Icon className="size-5 text-[var(--primary)]" />
              <div className="mt-3 font-semibold text-sm">{m.label}</div>
              <div className="text-xs text-zinc-500">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Preview / canvas wrapper */}
        <div
          ref={canvasPreviewRef}
          className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-[var(--border)]"
        >
          {(mode === "screen" || mode === "screen-camera") && status !== "idle" ? (
            <video
              ref={screenVideoRef}
              className="absolute inset-0 w-full h-full object-contain"
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center p-6">
              <div>
                <div className="mx-auto size-14 rounded-full bg-white/10 grid place-items-center">
                  <VideoIcon className="size-6 text-white" />
                </div>
                <p className="mt-3 text-white/80 text-sm max-w-sm">
                  {mode === "audio"
                    ? "Audio-only recording. Speak after starting."
                    : mode === "camera"
                    ? "Your camera feed will appear here once recording begins."
                    : "Your screen will appear here once you start and pick a window/tab."}
                </p>
              </div>
            </div>
          )}

          {/* Camera bubble draggable overlay */}
          {(mode === "screen-camera" || mode === "camera") && cameraOn && (
            <Rnd
              size={{ width: bubble.w, height: bubble.h }}
              position={{ x: bubble.x, y: bubble.y }}
              onDragStop={(_, d) => setBubble((b) => ({ ...b, x: d.x, y: d.y }))}
              onResizeStop={(_, __, ref, ___, pos) =>
                setBubble({
                  w: parseInt(ref.style.width),
                  h: parseInt(ref.style.width),
                  x: pos.x,
                  y: pos.y,
                })
              }
              lockAspectRatio
              bounds="parent"
              className={mode === "camera" ? "hidden" : ""}
            >
              <div className="size-full rounded-full overflow-hidden ring-4 ring-white/90 shadow-xl bg-black">
                <video
                  ref={cameraVideoRef}
                  muted
                  autoPlay
                  playsInline
                  className="size-full object-cover"
                />
              </div>
            </Rnd>
          )}

          {mode === "camera" && (
            <video
              ref={cameraVideoRef}
              muted
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Live captions overlay */}
          {liveCaptions &&
            (status === "recording" || status === "paused") &&
            (finalTranscript || interimTranscript) && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 max-w-[85%] pointer-events-none">
                <div className="rounded-xl bg-black/65 backdrop-blur px-4 py-2 text-center shadow-lg">
                  <span className="text-white text-base md:text-lg leading-snug">
                    {finalTranscript}
                  </span>{" "}
                  <span className="text-yellow-300 text-base md:text-lg leading-snug">
                    {interimTranscript}
                  </span>
                </div>
              </div>
            )}

          {countdown !== null && (
            <div className="absolute inset-0 bg-black/60 grid place-items-center">
              <div className="text-white text-[120px] font-bold tabular-nums">
                {countdown}
              </div>
            </div>
          )}
        </div>

        {/* Hidden compositing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live captions toggle hint */}
        {(mic || mode === "audio") && (
          <div className="mt-3 flex items-center justify-between bg-white border border-[var(--border)] rounded-xl px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <CaptionsIcon className="size-4 text-[var(--primary)]" />
              <span className="font-medium">Live captions</span>
              {!browserSupportsSpeechRecognition && (
                <span className="text-xs text-amber-600">
                  (Not supported in this browser — use Chrome)
                </span>
              )}
              {listening && (
                <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Listening
                </span>
              )}
            </div>
            <button
              onClick={() => setLiveCaptions((v) => !v)}
              disabled={status !== "idle"}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-semibold border",
                liveCaptions
                  ? "bg-[var(--primary)] text-white border-transparent"
                  : "bg-white text-zinc-700 border-[var(--border)]",
                status !== "idle" && "opacity-60 cursor-not-allowed"
              )}
            >
              {liveCaptions ? "On" : "Off"}
            </button>
          </div>
        )}

        {/* Transcription progress modal */}
        {transcribing && (
          <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="size-5 animate-spin text-[var(--primary)]" />
                <div className="font-semibold">Generating captions & chapters</div>
              </div>
              <p className="text-sm text-zinc-600 mb-4">
                {transcribeStatus || "Running Whisper on the audio…"}
              </p>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(4, transcribeProgress))}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-3">
                First run downloads the Whisper model (~75&nbsp;MB). Cached afterward.
              </p>
            </div>
          </div>
        )}

        {/* Device + toggles */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Camera className="size-4" /> Camera
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setCameraOn((v) => !v)}
                className={cn(
                  "h-9 px-3 rounded-full text-xs font-semibold border",
                  cameraOn
                    ? "bg-[var(--primary)] text-white border-transparent"
                    : "bg-white text-zinc-700 border-[var(--border)]"
                )}
              >
                {cameraOn ? "On" : "Off"}
              </button>
            </div>
            <select
              value={selectedCamId ?? ""}
              onChange={(e) => setSelectedCamId(e.target.value || null)}
              className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm bg-white"
              disabled={status !== "idle"}
            >
              {devices
                .filter((d) => d.kind === "videoinput")
                .map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || "Camera"}
                  </option>
                ))}
              {devices.filter((d) => d.kind === "videoinput").length === 0 && (
                <option value="">Default camera</option>
              )}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}{" "}
              Microphone
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setMic((v) => !v)}
                className={cn(
                  "h-9 px-3 rounded-full text-xs font-semibold border",
                  mic
                    ? "bg-[var(--primary)] text-white border-transparent"
                    : "bg-white text-zinc-700 border-[var(--border)]"
                )}
              >
                {mic ? "On" : "Off"}
              </button>
            </div>
            <select
              value={selectedMicId ?? ""}
              onChange={(e) => setSelectedMicId(e.target.value || null)}
              className="w-full h-10 rounded-lg border border-[var(--border)] px-3 text-sm bg-white"
              disabled={status !== "idle"}
            >
              {devices
                .filter((d) => d.kind === "audioinput")
                .map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || "Microphone"}
                  </option>
                ))}
              {devices.filter((d) => d.kind === "audioinput").length === 0 && (
                <option value="">Default microphone</option>
              )}
            </select>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {status === "idle" ? (
            <button
              onClick={start}
              className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-lg"
            >
              <span className="size-3 rounded-full bg-white" />
              Start Recording
            </button>
          ) : (
            <>
              <button
                onClick={pause}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white border border-[var(--border)] font-semibold text-sm"
              >
                {status === "paused" ? (
                  <>
                    <Play className="size-4" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-4" /> Pause
                  </>
                )}
              </button>
              <button
                onClick={stop}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-red-600 text-white font-semibold text-sm"
              >
                <Square className="size-4" /> Stop & Save
              </button>
              <button
                onClick={() => {
                  stopAllStreams();
                  chunksRef.current = [];
                  if (recorderRef.current?.state !== "inactive") {
                    try {
                      recorderRef.current?.stop();
                    } catch {}
                  }
                  if (timerRef.current) window.clearInterval(timerRef.current);
                  setStatus("idle");
                  setElapsed(0);
                }}
                className="inline-flex items-center gap-2 h-12 px-4 rounded-full bg-white border border-[var(--border)] text-sm text-zinc-600"
              >
                <X className="size-4" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
