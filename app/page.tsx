"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Share2, Link2, Plus, Video, Play, BarChart3 } from "lucide-react";
import { formatDuration, formatRelative } from "@/lib/utils";

export default function Home() {
  const recordings = useStore((s) => s.recordings);
  const latest = recordings[0];
  const totalViews = recordings.reduce((acc, r) => acc + r.analytics.views, 0);
  const totalWatch = recordings.reduce(
    (acc, r) => acc + r.analytics.totalWatchSeconds,
    0
  );
  const totalCompletions = recordings.reduce(
    (acc, r) => acc + r.analytics.completions,
    0
  );

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Home</h1>
      </div>

      <div className="gradient-banner rounded-2xl border border-[var(--border)] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold leading-tight">
            {latest ? (
              <>
                Share{" "}
                <span className="text-[var(--primary)]">
                  {latest.title.length > 24
                    ? latest.title.slice(0, 24) + "…"
                    : latest.title}
                </span>{" "}
                with your audience or team for review
              </>
            ) : (
              <>
                Create your first{" "}
                <span className="text-[var(--primary)]">screen recording</span>{" "}
                and share it instantly
              </>
            )}
          </h2>
          <p className="text-sm text-zinc-600 mt-2 max-w-xl">
            Record your screen, camera, and mic. Auto-generate captions, trim
            and edit, then share a beautiful player with built-in analytics.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {latest ? (
            <>
              <Link
                href={`/watch/${latest.shareId}`}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-[var(--border)] font-semibold text-sm hover:bg-[var(--muted)]"
              >
                <Link2 className="size-4" /> Open
              </Link>
              <Link
                href={`/watch/${latest.shareId}`}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[var(--primary)] text-white font-semibold text-sm hover:opacity-95"
              >
                <Share2 className="size-4" /> Share
              </Link>
            </>
          ) : (
            <Link
              href="/record"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[var(--primary)] text-white font-semibold text-sm hover:opacity-95"
            >
              <Plus className="size-4" /> New Recording
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard
          label="Plays from unique visitors"
          value={recordings.reduce((a, r) => a + r.analytics.uniqueViewers, 0)}
          delta="+12%"
          accent="blue"
        />
        <StatCard
          label="Total watch time"
          value={formatDuration(totalWatch)}
          delta="+5%"
          accent="green"
        />
        <StatCard
          label="Completions"
          value={totalCompletions}
          delta={totalViews ? `${Math.round((totalCompletions / totalViews) * 100)}%` : "—"}
          accent="purple"
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recent recordings</h3>
          <Link
            href="/library"
            className="text-sm text-[var(--primary)] font-medium hover:underline"
          >
            View all
          </Link>
        </div>

        {recordings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recordings.slice(0, 6).map((r) => (
              <RecordingCard key={r.id} recording={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: number | string;
  delta: string;
  accent: "blue" | "green" | "purple";
}) {
  const bg = {
    blue: "from-blue-50 to-transparent",
    green: "from-emerald-50 to-transparent",
    purple: "from-violet-50 to-transparent",
  }[accent];
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${bg} border border-[var(--border)] bg-white p-5`}
    >
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {delta}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[var(--border)] rounded-2xl bg-white p-10 text-center">
      <div className="mx-auto size-14 rounded-full bg-[var(--accent)] grid place-items-center">
        <Video className="size-6 text-[var(--primary)]" />
      </div>
      <h4 className="mt-4 font-bold text-lg">No recordings yet</h4>
      <p className="text-sm text-zinc-500 mt-1">
        Hit the big blue button to record your first screen capture.
      </p>
      <Link
        href="/record"
        className="inline-flex items-center gap-2 h-10 px-5 mt-5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
      >
        <Plus className="size-4" /> New Recording
      </Link>
    </div>
  );
}

function RecordingCard({ recording }: { recording: ReturnType<typeof useStore.getState>["recordings"][number] }) {
  return (
    <Link
      href={`/watch/${recording.shareId}`}
      className="group block rounded-2xl bg-white border border-[var(--border)] overflow-hidden hover:shadow-md transition"
    >
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-950 grid place-items-center">
        {recording.thumbnailDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recording.thumbnailDataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="relative size-12 rounded-full bg-white/90 grid place-items-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition">
          <Play className="size-5 text-slate-900 ml-0.5" />
        </div>
        <div className="absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded bg-black/70 text-white">
          {formatDuration(recording.durationSec)}
        </div>
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm truncate">{recording.title}</div>
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
          <span>{formatRelative(recording.createdAt)}</span>
          <span className="flex items-center gap-1">
            <BarChart3 className="size-3" />
            {recording.analytics.views} plays
          </span>
        </div>
      </div>
    </Link>
  );
}
