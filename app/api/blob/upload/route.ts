import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only allow uploads under these prefixes
        if (!pathname.startsWith("videos/") && !pathname.startsWith("thumbs/")) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: [
            "video/webm",
            "video/mp4",
            "application/octet-stream",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // no-op
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
