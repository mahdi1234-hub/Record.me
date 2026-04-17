# Record.me

Open-source, browser-first screen recording SaaS inspired by Loom & Wistia. Record, edit, transcribe, and share videos — entirely in your browser, with zero backend.

## Features

- **Recording**: screen, camera, screen+camera (PiP), or audio-only via MediaRecorder
- **PiP compositor**: draggable + resizable camera bubble on top of the screen (Canvas API)
- **Custom player**: chapters, captions overlay, heatmap seek bar, PiP, keyboard shortcuts, speed
- **Editor**: FFmpeg.wasm trim, wavesurfer.js waveform regions, transcript editor, SRT/VTT/TXT export
- **Transcription**: in-browser Whisper via `@xenova/transformers` — free, no API key
- **Analytics**: plays, unique viewers, watch time, retention curve, engagement heatmap, device pie, referrers
- **Library / Favorites / Spaces / AI Studio / Settings** pages

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Zustand · idb-keyval · @ffmpeg/ffmpeg · wavesurfer.js · @xenova/transformers · recharts · sonner · lucide-react · react-rnd · react-webcam · fix-webm-duration

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel. The project ships a `vercel.json` that sets the required
`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers so
`SharedArrayBuffer` (needed by Whisper + FFmpeg) is available.

## License

MIT
