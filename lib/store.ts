"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export type CaptionCue = {
  start: number;
  end: number;
  text: string;
};

export type AnalyticsEvent = {
  type: "play" | "pause" | "seek" | "complete" | "progress";
  position: number;
  timestamp: number;
  sessionId: string;
};

export type Recording = {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
  mode: "screen" | "screen-camera" | "camera" | "audio";
  trim?: { start: number; end: number };
  captions?: CaptionCue[];
  chapters?: { title: string; start: number }[];
  transcribing?: boolean;
  thumbnailDataUrl?: string;
  /**
   * Public video URL (Vercel Blob) used by the iframe embed route so the
   * recording can be played on third-party sites. `undefined` when the
   * recording hasn't been uploaded (cloud storage disabled / offline).
   */
  cloudVideoUrl?: string;
  shareId: string;
  analytics: {
    views: number;
    uniqueViewers: number;
    totalWatchSeconds: number;
    completions: number;
    heatmap: number[]; // bucketed plays per ~100 buckets
    events: AnalyticsEvent[];
    devices: Record<string, number>;
    referrers: Record<string, number>;
  };
};

type State = {
  recordings: Recording[];
  viewerSessionId: string;
  addRecording: (r: Omit<Recording, "shareId" | "analytics">) => Recording;
  updateRecording: (id: string, patch: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  getByShareId: (shareId: string) => Recording | undefined;
  trackEvent: (id: string, event: Omit<AnalyticsEvent, "timestamp" | "sessionId">) => void;
  trackView: (id: string) => void;
};

function createShareId() {
  return nanoid(10);
}

function emptyAnalytics(): Recording["analytics"] {
  return {
    views: 0,
    uniqueViewers: 0,
    totalWatchSeconds: 0,
    completions: 0,
    heatmap: new Array(100).fill(0),
    events: [],
    devices: {},
    referrers: {},
  };
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobi|android|iphone/.test(ua)) return "mobile";
  if (/ipad|tablet/.test(ua)) return "tablet";
  return "desktop";
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      recordings: [],
      viewerSessionId: nanoid(12),
      addRecording: (r) => {
        const rec: Recording = {
          ...r,
          shareId: createShareId(),
          analytics: emptyAnalytics(),
        };
        set((s) => ({ recordings: [rec, ...s.recordings] }));
        return rec;
      },
      updateRecording: (id, patch) =>
        set((s) => ({
          recordings: s.recordings.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        })),
      deleteRecording: (id) =>
        set((s) => ({ recordings: s.recordings.filter((r) => r.id !== id) })),
      getByShareId: (shareId) => get().recordings.find((r) => r.shareId === shareId),
      trackView: (id) => {
        const sessionId = get().viewerSessionId;
        set((s) => ({
          recordings: s.recordings.map((r) => {
            if (r.id !== id) return r;
            const alreadyViewed = r.analytics.events.some(
              (e) => e.sessionId === sessionId
            );
            const device = detectDevice();
            const ref =
              typeof document !== "undefined" && document.referrer
                ? new URL(document.referrer).hostname
                : "direct";
            return {
              ...r,
              analytics: {
                ...r.analytics,
                views: r.analytics.views + 1,
                uniqueViewers: alreadyViewed
                  ? r.analytics.uniqueViewers
                  : r.analytics.uniqueViewers + 1,
                devices: {
                  ...r.analytics.devices,
                  [device]: (r.analytics.devices[device] ?? 0) + 1,
                },
                referrers: {
                  ...r.analytics.referrers,
                  [ref]: (r.analytics.referrers[ref] ?? 0) + 1,
                },
              },
            };
          }),
        }));
      },
      trackEvent: (id, event) => {
        const sessionId = get().viewerSessionId;
        set((s) => ({
          recordings: s.recordings.map((r) => {
            if (r.id !== id) return r;
            const heatmap = [...r.analytics.heatmap];
            const dur = r.durationSec || 1;
            const bucket = Math.min(
              99,
              Math.max(0, Math.floor((event.position / dur) * 100))
            );
            if (event.type === "play" || event.type === "progress") heatmap[bucket]++;
            const completed =
              event.type === "complete"
                ? r.analytics.completions + 1
                : r.analytics.completions;
            const watch =
              event.type === "progress"
                ? r.analytics.totalWatchSeconds + 1
                : r.analytics.totalWatchSeconds;
            return {
              ...r,
              analytics: {
                ...r.analytics,
                heatmap,
                completions: completed,
                totalWatchSeconds: watch,
                events: [
                  ...r.analytics.events.slice(-499),
                  { ...event, sessionId, timestamp: Date.now() },
                ],
              },
            };
          }),
        }));
      },
    }),
    {
      name: "recordme-state",
      partialize: (s) => ({
        recordings: s.recordings,
        viewerSessionId: s.viewerSessionId,
      }),
    }
  )
);
