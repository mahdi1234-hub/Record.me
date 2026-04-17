"use client";

import Link from "next/link";
import { Star } from "lucide-react";

export default function FavoritesPage() {
  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Favorites</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Recordings you star will appear here for quick access.
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
        <div className="mx-auto size-14 rounded-full bg-amber-50 grid place-items-center">
          <Star className="size-6 text-amber-500" />
        </div>
        <h2 className="mt-4 font-bold text-lg">No favorites yet</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Star a recording from your library to keep it handy.
        </p>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 h-10 px-5 mt-5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
        >
          Go to Library
        </Link>
      </div>
    </div>
  );
}
