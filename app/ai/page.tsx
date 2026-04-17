"use client";

import Link from "next/link";
import { Sparkles, FileText, Wand2, Languages } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Auto transcripts",
    desc: "Whisper runs in your browser — 99 languages, zero cost per transcription.",
  },
  {
    icon: Wand2,
    title: "Smart chapters",
    desc: "Auto-detect topic changes and jump straight to the section that matters.",
  },
  {
    icon: Languages,
    title: "Captions (SRT/VTT)",
    desc: "Download subtitles in any standard format for your CMS or LMS.",
  },
];

export default function AiPage() {
  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[var(--accent)] grid place-items-center">
          <Sparkles className="size-5 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            AI Studio
          </h1>
          <p className="text-sm text-zinc-500">
            Transcribe, summarize, and enhance your recordings — all in-browser.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-2xl border border-[var(--border)] p-5"
          >
            <f.icon className="size-5 text-[var(--primary)]" />
            <div className="mt-4 font-bold">{f.title}</div>
            <p className="text-sm text-zinc-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="gradient-banner rounded-2xl border border-[var(--border)] p-6 md:p-8 mt-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Try it on your next recording</h2>
          <p className="text-sm text-zinc-600 mt-2 max-w-xl">
            Hit record, then open the editor to generate a transcript, chapters,
            and downloadable captions in seconds.
          </p>
        </div>
        <Link
          href="/record"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[var(--primary)] text-white font-semibold text-sm"
        >
          <Sparkles className="size-4" /> Start Recording
        </Link>
      </div>
    </div>
  );
}
