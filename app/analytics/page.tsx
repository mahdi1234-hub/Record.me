"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/utils";
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function AnalyticsOverviewPage() {
  const recordings = useStore((s) => s.recordings);

  const totalViews = recordings.reduce((a, r) => a + r.analytics.views, 0);
  const totalWatch = recordings.reduce(
    (a, r) => a + r.analytics.totalWatchSeconds,
    0
  );
  const totalCompletions = recordings.reduce(
    (a, r) => a + r.analytics.completions,
    0
  );
  const uniqueViewers = recordings.reduce(
    (a, r) => a + r.analytics.uniqueViewers,
    0
  );

  // Views by day (based on events)
  const byDay = new Map<string, number>();
  for (const r of recordings) {
    for (const e of r.analytics.events) {
      if (e.type === "play") {
        const d = new Date(e.timestamp).toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
    }
  }
  const daySeries = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }));

  const topVideos = [...recordings]
    .sort((a, b) => b.analytics.views - a.analytics.views)
    .slice(0, 5);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Analytics</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Workspace-wide performance across all recordings.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Kpi
          icon={Users}
          label="Unique viewers"
          value={uniqueViewers}
          delta="+18%"
          color="blue"
        />
        <Kpi
          icon={BarChart3}
          label="Total plays"
          value={totalViews}
          delta="+24%"
          color="violet"
        />
        <Kpi
          icon={Clock}
          label="Watch time"
          value={formatDuration(totalWatch)}
          delta="+12%"
          color="emerald"
        />
        <Kpi
          icon={CheckCircle2}
          label="Completions"
          value={totalCompletions}
          delta={totalViews ? `${Math.round((totalCompletions / totalViews) * 100)}%` : "—"}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mt-8">
        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold">Plays over time</h2>
          <div className="h-64 mt-2">
            {daySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daySeries}>
                  <defs>
                    <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3340e6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3340e6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3340e6"
                    strokeWidth={2}
                    fill="url(#pv)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-zinc-500">
                No plays yet. Share a video to start collecting data.
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="size-4" /> Top recordings
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {topVideos.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 justify-between"
              >
                <Link
                  href={`/analytics/${r.id}`}
                  className="font-medium truncate hover:underline"
                >
                  {r.title}
                </Link>
                <span className="text-zinc-500 tabular-nums">
                  {r.analytics.views}
                </span>
              </li>
            ))}
            {topVideos.length === 0 && (
              <li className="text-zinc-500">No recordings yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  delta: string;
  color: "blue" | "violet" | "emerald" | "rose";
}) {
  const cls = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  }[color];
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-center gap-2">
        <span className={`size-8 grid place-items-center rounded-full ${cls}`}>
          <Icon className="size-4" />
        </span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <span className="text-xs font-semibold text-emerald-600">{delta}</span>
      </div>
    </div>
  );
}
