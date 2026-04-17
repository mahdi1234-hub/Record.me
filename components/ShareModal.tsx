"use client";

import { useState } from "react";
import { Check, Copy, X, Mail, Code2 } from "lucide-react";
import { toast } from "sonner";

export default function ShareModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"share" | "embed">("share");

  const embedCode = `<iframe src="${url}?embed=1" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold">Share recording</h2>
          <button
            onClick={onClose}
            className="size-8 grid place-items-center rounded-full hover:bg-[var(--muted)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 pt-3">
          <div className="inline-flex rounded-full bg-[var(--muted)] p-1 text-sm">
            <button
              onClick={() => setTab("share")}
              className={
                "px-4 py-1.5 rounded-full " +
                (tab === "share" ? "bg-white shadow font-semibold" : "text-zinc-500")
              }
            >
              Link
            </button>
            <button
              onClick={() => setTab("embed")}
              className={
                "px-4 py-1.5 rounded-full " +
                (tab === "embed" ? "bg-white shadow font-semibold" : "text-zinc-500")
              }
            >
              Embed
            </button>
          </div>
        </div>

        {tab === "share" ? (
          <div className="p-5">
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 h-11 rounded-full border border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-mono"
              />
              <button
                onClick={() => copy(url)}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-xs text-zinc-500 mt-3">
              Note: recordings are stored locally in your browser. For a
              production SaaS, wire this modal to your storage backend (S3,
              Cloudflare R2, etc).
            </div>
            <div className="mt-5">
              <div className="text-xs font-semibold text-zinc-500 mb-2">
                Or share via
              </div>
              <div className="flex gap-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    title
                  )}&body=${encodeURIComponent(url)}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[var(--muted)] text-sm hover:bg-zinc-100"
                >
                  <Mail className="size-4" /> Email
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    title
                  )}&url=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[var(--muted)] text-sm hover:bg-zinc-100"
                >
                  <span aria-hidden>𝕏</span> Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    url
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[var(--muted)] text-sm hover:bg-zinc-100"
                >
                  <span aria-hidden className="font-bold">in</span> LinkedIn
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
              <Code2 className="size-4" />
              Paste this iframe snippet to embed the video on your site.
            </div>
            <textarea
              readOnly
              value={embedCode}
              className="w-full h-32 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs font-mono"
            />
            <button
              onClick={() => copy(embedCode)}
              className="mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[var(--primary)] text-white text-sm font-semibold"
            >
              <Copy className="size-4" /> Copy embed code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
