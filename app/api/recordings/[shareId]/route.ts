import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

export const runtime = "nodejs";

type CloudRecording = {
  shareId: string;
  title: string;
  createdAt: number;
  durationSec: number;
  mode: string;
  videoUrl: string;
  thumbnailUrl?: string;
  captions?: { start: number; end: number; text: string }[];
  chapters?: { title: string; start: number }[];
  savedAt: number;
};

function metaKey(shareId: string) {
  return `recordings/${shareId}.json`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "cloud_storage_not_configured" },
      { status: 503 }
    );
  }
  try {
    // head() returns metadata including the public download URL
    const info = await head(metaKey(shareId));
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = (await res.json()) as CloudRecording;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "cloud_storage_not_configured" },
      { status: 503 }
    );
  }
  const { shareId } = await params;
  const body = (await req.json()) as Omit<CloudRecording, "shareId" | "savedAt">;
  const payload: CloudRecording = {
    ...body,
    shareId,
    savedAt: Date.now(),
  };
  const blob = await put(metaKey(shareId), JSON.stringify(payload), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return NextResponse.json({ url: blob.url, ok: true });
}
