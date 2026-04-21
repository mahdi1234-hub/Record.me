"use client";

import Link from "next/link";
import { Search, Bell, Plus } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-[64px] bg-white border-b border-[var(--border)] flex items-center px-6 gap-4 sticky top-0 z-20">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <input
          placeholder="Search recordings, people, channels…"
          className="w-full h-10 pl-10 pr-4 rounded-full bg-[var(--muted)] border border-transparent focus:border-[var(--primary)] outline-none text-sm"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="size-10 grid place-items-center rounded-full hover:bg-[var(--muted)]">
          <Bell className="size-[18px] text-zinc-600" />
        </button>
        <Link
          href="/record"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-95"
        >
          <Plus className="size-4" />
          Create
        </Link>
        <div className="size-10 rounded-full bg-gradient-to-br from-pink-400 to-red-500 grid place-items-center text-white font-bold text-sm">
          ME
        </div>
      </div>
    </header>
  );
}
