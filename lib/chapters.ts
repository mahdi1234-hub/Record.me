import type { CaptionCue } from "./store";

export type Chapter = { title: string; start: number };

/**
 * Group caption cues into chapter markers. Produces a chapter roughly every
 * `targetSeconds` seconds, titled with the first few words of the segment.
 */
export function cuesToChapters(
  cues: CaptionCue[],
  opts: { targetSeconds?: number; maxChapters?: number; titleWords?: number } = {}
): Chapter[] {
  const targetSeconds = opts.targetSeconds ?? 30;
  const maxChapters = opts.maxChapters ?? 20;
  const titleWords = opts.titleWords ?? 8;

  if (!cues.length) return [];

  const totalDuration = cues[cues.length - 1].end;
  const desired = Math.max(
    1,
    Math.min(maxChapters, Math.ceil(totalDuration / targetSeconds))
  );
  const bucketSize = totalDuration / desired;

  const groups: CaptionCue[][] = Array.from({ length: desired }, () => []);
  for (const cue of cues) {
    const idx = Math.min(desired - 1, Math.floor(cue.start / bucketSize));
    groups[idx].push(cue);
  }

  const chapters: Chapter[] = [];
  let prevStart = -Infinity;
  groups.forEach((group, i) => {
    if (!group.length) return;
    const text = group
      .map((c) => c.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const words = text.split(" ").filter(Boolean).slice(0, titleWords);
    let title = words.join(" ");
    if (text.split(" ").length > titleWords) title += "…";
    if (!title) title = `Chapter ${i + 1}`;
    const start = i === 0 ? 0 : group[0].start;
    if (start - prevStart < 5) return;
    prevStart = start;
    chapters.push({ title, start });
  });

  return chapters;
}
