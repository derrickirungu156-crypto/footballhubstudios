import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { searchFootballVideos, YoutubeApiError } from "@/lib/youtube";
import { ingestDiscoveredVideos } from "@/lib/ingest";

// §26, §55 — trigger from an external scheduler (Vercel Cron, GitHub Actions,
// etc.) on the interval you want channel monitoring to run at. Protected by
// JOBS_SECRET rather than admin session, since schedulers aren't logged in.
//
// Example Vercel Cron entry (vercel.json):
// { "crons": [{ "path": "/api/jobs/poll-channels", "schedule": "*/15 * * * *" }] }
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.JOBS_SECRET}`;
  if (!process.env.JOBS_SECRET || auth !== expected) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid job token." } },
      { status: 401 }
    );
  }

  const channels = await prisma.youtubeChannel.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" }
  });

  const results: Array<{ channelId: string; ingested: number; error?: string }> = [];

  for (const channel of channels) {
    try {
      const { results: videos } = await searchFootballVideos({
        query: channel.channelName,
        channelId: channel.channelId,
        publishedAfter: channel.lastCheckedAt?.toISOString(),
        maxResults: 25
      });

      const saved = await ingestDiscoveredVideos(videos, `channel:${channel.channelName}`);

      await prisma.youtubeChannel.update({
        where: { id: channel.id },
        data: { lastCheckedAt: new Date() }
      });

      results.push({ channelId: channel.channelId, ingested: saved.length });
    } catch (err) {
      const message = err instanceof YoutubeApiError ? err.message : "Unknown error";
      results.push({ channelId: channel.channelId, ingested: 0, error: message });
      // Keep going — one channel's failure never blocks the rest (§85).
    }
  }

  return NextResponse.json({ success: true, data: { channelsPolled: channels.length, results } });
}
