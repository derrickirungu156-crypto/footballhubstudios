import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVideoDetails, YoutubeApiError } from "@/lib/youtube";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { id } = await params;

  const stored = await prisma.youtubeVideo.findUnique({ where: { id } });
  if (!stored) {
    return errorResponse("NOT_FOUND", "Video not found.", 404);
  }

  try {
    const [details] = await getVideoDetails([stored.youtubeVideoId]);
    return NextResponse.json({
      success: true,
      data: { ...stored, ...details }
    });
  } catch (err) {
    if (err instanceof YoutubeApiError) {
      // Don't fail the whole response — return what's stored, flag stats as unavailable.
      return NextResponse.json({
        success: true,
        data: { ...stored, statsUnavailable: true }
      });
    }
    console.error("youtube/videos/[id] failed", err);
    return errorResponse("INTERNAL_ERROR", "Something went wrong loading this video.", 500);
  }
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
