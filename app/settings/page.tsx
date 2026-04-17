"use client";

import { useStore } from "@/lib/store";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { deleteThumbnail, deleteVideoBlob, listVideoIds } from "@/lib/db";

export default function SettingsPage() {
  const recordings = useStore((s) => s.recordings);
  const totalBytes = recordings.reduce((a, r) => a + r.sizeBytes, 0);

  async function clearAll() {
    if (!confirm("Delete all recordings? This cannot be undone.")) return;
    const ids = await listVideoIds();
    for (const id of ids) {
      await deleteVideoBlob(id);
      await deleteThumbnail(id);
    }
    useStore.setState({ recordings: [] });
    toast.success("All recordings deleted");
  }

  return (
    <div className="p-6 md:p-10 max-w-[900px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Manage your workspace and local storage.
      </p>

      <section className="mt-8 bg-white rounded-2xl border border-[var(--border)] p-5">
        <h2 className="font-bold">Storage</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Recordings are stored in your browser using IndexedDB.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-[var(--muted)] p-3">
            <div className="text-zinc-500 text-xs">Recordings</div>
            <div className="font-bold text-lg mt-1">{recordings.length}</div>
          </div>
          <div className="rounded-xl bg-[var(--muted)] p-3">
            <div className="text-zinc-500 text-xs">Total size</div>
            <div className="font-bold text-lg mt-1">
              {formatBytes(totalBytes)}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--muted)] p-3">
            <div className="text-zinc-500 text-xs">Captions generated</div>
            <div className="font-bold text-lg mt-1">
              {recordings.filter((r) => r.captions && r.captions.length).length}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-red-200 bg-red-50 text-red-700 text-sm font-semibold"
          >
            Delete all recordings
          </button>
        </div>
      </section>

      <section className="mt-6 bg-white rounded-2xl border border-[var(--border)] p-5">
        <h2 className="font-bold">About Record.me</h2>
        <p className="text-sm text-zinc-500 mt-2">
          Record.me is an open-source, browser-first screen recording SaaS.
          Recording, editing, transcription (via{" "}
          <code>@xenova/transformers</code>) and analytics all happen locally —
          nothing is uploaded to a server by default.
        </p>
      </section>
    </div>
  );
}
