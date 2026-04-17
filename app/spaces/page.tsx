"use client";

import { Users } from "lucide-react";

export default function SpacesPage() {
  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Spaces</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Collaborative channels for your team and clients.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Product Demos", count: 12, color: "from-blue-100 to-indigo-50" },
          { name: "Bug Reports", count: 6, color: "from-rose-100 to-pink-50" },
          { name: "Onboarding", count: 9, color: "from-emerald-100 to-teal-50" },
        ].map((s) => (
          <div
            key={s.name}
            className={`rounded-2xl bg-gradient-to-br ${s.color} border border-[var(--border)] p-5`}
          >
            <Users className="size-5 text-zinc-600" />
            <div className="mt-6 font-bold text-lg">{s.name}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.count} recordings</div>
          </div>
        ))}
      </div>
    </div>
  );
}
