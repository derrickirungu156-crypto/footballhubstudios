import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { searchFootballVideos, YoutubeApiError } from "@/lib/youtube";
import { ingestDiscoveredVideos } from "@/lib/ingest";

// §52 — Studio API. Never called from a public page; middleware already
// protects everything under /admin, but this route can be hit directly too,
// so it checks the session itself.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) {
    return errorResponse("MISSING_QUERY", "A search query (q) is required.", 400);
  }

  const publishedAfter = searchParams.get("publishedAfter") ?? undefined;
  const channelId = searchParams.get("channelId") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    const { results, nextPageToken } = await searchFootballVideos({
      query,
      publishedAfter,
      channelId,
      pageToken
    });

    const saved = await ingestDiscoveredVideos(results, query);

    return NextResponse.json({
      success: true,
      data: {
        videos: saved.map((s) => ({
          id: s.record.id,
          youtubeVideoId: s.record.youtubeVideoId,
          title: s.record.title,
          channelTitle: s.record.channelTitle,
          thumbnailUrl: s.record.thumbnailUrl,
          publishedAt: s.record.publishedAt,
          classification: s.record.classification,
          classificationConfidence: s.record.classificationConfidence,
          suggestedMatch: s.suggestedMatch
        })),
        nextPageToken
      }
    });
  } catch (err) {
    if (err instanceof YoutubeApiError) {
      return errorResponse("YOUTUBE_API_ERROR", "Unable to retrieve recent football videos.", 502);
    }
    console.error("youtube/search failed", err);
    return errorResponse("INTERNAL_ERROR", "Something went wrong while searching YouTube.", 500);
  }
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
