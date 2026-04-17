"use client";

import Link from "next/link";
import { Plus, Trash2, Pencil, Share2, BarChart3, Play } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  formatBytes,
  formatDuration,
  formatRelative,
  cn,
} from "@/lib/utils";
import { deleteThumbnail, deleteVideoBlob } from "@/lib/db";
import { toast } from "sonner";
import { useState } from "react";

export default function LibraryPage() {
  const recordings = useStore((s) => s.recordings);
  const deleteRecording = useStore((s) => s.deleteRecording);
  const [view, setView] = useState<"grid" | "list">("grid");

  async function remove(id: string) {
    await deleteVideoBlob(id);
    await deleteThumbnail(id);
    deleteRecording(id);
    toast.success("Recording deleted");
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Content Library
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {recordings.length}{" "}
            {recordings.length === 1 ? "recording" : "recordings"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1 text-sm">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "px-3 py-1.5 rounded-full",
                view === "grid" && "bg-[var(--muted)] font-semibold"
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-3 py-1.5 rounded-full",
                view === "list" && "bg-[var(--muted)] font-semibold"
              )}
            >
              List
            </button>
          </div>
          <Link
            href="/record"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
          >
            <Plus className="size-4" /> New Recording
          </Link>
        </div>
      </div>

      {recordings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
          <h2 className="font-bold text-lg">No recordings yet</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Create your first recording to get started.
          </p>
          <Link
            href="/record"
            className="inline-flex items-center gap-2 h-10 px-5 mt-5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
          >
            <Plus className="size-4" /> New Recording
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordings.map((r) => (
            <div
              key={r.id}
              className="group rounded-2xl bg-white border border-[var(--border)] overflow-hidden hover:shadow-md transition"
            >
              <Link
                href={`/watch/${r.shareId}`}
                className="block relative aspect-video bg-slate-900"
              >
                {r.thumbnailDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailDataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 grid place-items-center opacity-80 group-hover:opacity-100 transition">
                  <div className="size-12 rounded-full bg-white/90 grid place-items-center">
                    <Play className="size-5 text-slate-900 ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded bg-black/70 text-white">
                  {formatDuration(r.durationSec)}
                </div>
              </Link>
              <div className="p-3">
                <div className="font-semibold text-sm truncate">{r.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatRelative(r.createdAt)}</span>
                  <span>{formatBytes(r.sizeBytes)}</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Link
                    href={`/edit/${r.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)]"
                  >
                    <Pencil className="size-3" /> Edit
                  </Link>
                  <Link
                    href={`/analytics/${r.id}`}
                    className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)] hover:bg-[var(--muted)]"
                    title="Analytics"
                  >
                    <BarChart3 className="size-3.5" />
                  </Link>
                  <Link
                    href={`/watch/${r.shareId}`}
                    className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)] hover:bg-[var(--muted)]"
                    title="Share"
                  >
                    <Share2 className="size-3.5" />
                  </Link>
                  <button
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)] text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-zinc-500 text-left">
              <tr>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Duration</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium">Views</th>
                <th className="py-3 px-4 font-medium">Size</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="py-3 px-4">
                    <Link
                      href={`/watch/${r.shareId}`}
                      className="font-semibold hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {formatDuration(r.durationSec)}
                  </td>
                  <td className="py-3 px-4">{formatRelative(r.createdAt)}</td>
                  <td className="py-3 px-4">{r.analytics.views}</td>
                  <td className="py-3 px-4">{formatBytes(r.sizeBytes)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/edit/${r.id}`}
                        className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)]"
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                      <Link
                        href={`/analytics/${r.id}`}
                        className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)]"
                      >
                        <BarChart3 className="size-3.5" />
                      </Link>
                      <button
                        onClick={() => remove(r.id)}
                        className="inline-flex items-center justify-center size-8 rounded-full border border-[var(--border)] text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
