"use client";

import Link from "next/link";
import { ChevronLeft, Eye, Users, Clock, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDuration, formatRelative } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function AnalyticsDetail({ id }: { id: string }) {
  const recording = useStore((s) => s.recordings.find((r) => r.id === id));

  if (!recording) {
    return (
      <div className="p-10">
        <Link href="/library" className="text-[var(--primary)] underline">
          ← Back to library
        </Link>
        <p className="mt-4">Recording not found.</p>
      </div>
    );
  }

  const heatmap = recording.analytics.heatmap.map((v, i) => ({
    bucket: i,
    second: (recording.durationSec * i) / 100,
    plays: v,
  }));

  const maxPlays = Math.max(1, ...heatmap.map((h) => h.plays));

  // Drop-off curve: cumulative % of views remaining
  const dropoff = (() => {
    const total = heatmap.reduce((a, b) => a + b.plays, 0);
    let cum = total;
    return heatmap.map((h) => {
      const pct = total > 0 ? (cum / total) * 100 : 0;
      cum -= h.plays;
      return { second: h.second, retention: pct };
    });
  })();

  const deviceData = Object.entries(recording.analytics.devices).map(
    ([name, value]) => ({ name, value })
  );
  const COLORS = ["#3340e6", "#16a34a", "#f59e0b", "#ec4899"];

  const referrerData = Object.entries(recording.analytics.referrers).map(
    ([name, value]) => ({ name, value })
  );

  const events = [...recording.analytics.events].slice(-20).reverse();

  const completionRate =
    recording.analytics.views > 0
      ? Math.round(
          (recording.analytics.completions / recording.analytics.views) * 100
        )
      : 0;

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="size-4" /> Library
        </Link>
        <div className="h-5 w-px bg-[var(--border)]" />
        <h1 className="text-xl md:text-2xl font-bold truncate">
          {recording.title}
        </h1>
        <span className="text-xs text-zinc-500">
          {formatRelative(recording.createdAt)}
        </span>
        <Link
          href={`/watch/${recording.shareId}`}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
        >
          Open video
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Kpi
          icon={Eye}
          label="Total plays"
          value={recording.analytics.views}
          color="violet"
        />
        <Kpi
          icon={Users}
          label="Unique viewers"
          value={recording.analytics.uniqueViewers}
          color="blue"
        />
        <Kpi
          icon={Clock}
          label="Watch time"
          value={formatDuration(recording.analytics.totalWatchSeconds)}
          color="emerald"
        />
        <Kpi
          icon={CheckCircle2}
          label="Completion rate"
          value={`${completionRate}%`}
          color="rose"
        />
      </div>

      {/* Drop-off + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold">Audience retention</h2>
          <p className="text-xs text-zinc-500">
            Percentage of viewers still watching at each second.
          </p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dropoff}>
                <defs>
                  <linearGradient id="ret" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="second"
                  tickFormatter={(s) => formatDuration(Number(s))}
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(0)}%`, "Retention"]}
                  labelFormatter={(label) => formatDuration(Number(label))}
                />
                <Area
                  type="monotone"
                  dataKey="retention"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#ret)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold">Engagement heatmap</h2>
          <p className="text-xs text-zinc-500">
            Parts of the video that were watched or replayed most.
          </p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="second"
                  tickFormatter={(s) => formatDuration(Number(s))}
                  fontSize={11}
                />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip
                  labelFormatter={(label) => formatDuration(Number(label))}
                />
                <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
                  {heatmap.map((h, i) => {
                    const ratio = h.plays / maxPlays;
                    // green → yellow → red palette
                    const color = ratio < 0.33
                      ? "#86efac"
                      : ratio < 0.66
                      ? "#facc15"
                      : "#ef4444";
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Device + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold">Device breakdown</h2>
          <div className="h-56 mt-2">
            {deviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-zinc-500">
                No data yet.
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <h2 className="font-semibold">Traffic sources</h2>
          <div className="h-56 mt-2">
            {referrerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referrerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3340e6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-zinc-500">
                No data yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Event log */}
      <section className="bg-white rounded-2xl border border-[var(--border)] p-4 mt-6">
        <h2 className="font-semibold">Recent activity</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500 mt-2">No events yet.</p>
        ) : (
          <table className="w-full mt-2 text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 font-medium">Event</th>
                <th className="py-2 font-medium">At</th>
                <th className="py-2 font-medium">When</th>
                <th className="py-2 font-medium">Session</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="py-2 capitalize font-medium">{e.type}</td>
                  <td className="py-2 tabular-nums">
                    {formatDuration(e.position)}
                  </td>
                  <td className="py-2">{formatRelative(e.timestamp)}</td>
                  <td className="py-2 font-mono text-xs text-zinc-500">
                    {e.sessionId.slice(0, 6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
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
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
