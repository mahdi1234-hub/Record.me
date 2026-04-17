import type { CaptionCue } from "./store";
import { secondsToTimestamp } from "./utils";

export function cuesToSRT(cues: CaptionCue[]): string {
  return cues
    .map((c, i) => {
      const start = secondsToTimestamp(c.start);
      const end = secondsToTimestamp(c.end);
      return `${i + 1}\n${start} --> ${end}\n${c.text}\n`;
    })
    .join("\n");
}

export function cuesToVTT(cues: CaptionCue[]): string {
  const body = cues
    .map((c) => {
      const start = secondsToTimestamp(c.start).replace(",", ".");
      const end = secondsToTimestamp(c.end).replace(",", ".");
      return `${start} --> ${end}\n${c.text}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function cuesToTXT(cues: CaptionCue[]): string {
  return cues.map((c) => c.text).join("\n");
}

export function downloadFile(content: string, filename: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
