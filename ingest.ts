import { prisma } from "./db";
import { classifyByKeywords, identifyMatchFromText } from "./classification";
import type { YoutubeSearchResult } from "./youtube";

// §27, §60 — store discovered videos, deduplicated by youtubeVideoId. Safe to
// call repeatedly with overlapping search results (e.g. the same video
// surfaced by two different queries) — it's an upsert, not an insert.
export async function ingestDiscoveredVideos(
  results: YoutubeSearchResult[],
  discoveryQuery: string
) {
  const saved = [];

  for (const video of results) {
    const { classification, confidence } = classifyByKeywords(video.title, video.description);
    const identification = await identifyMatchFromText(video.title, video.description);

    const record = await prisma.youtubeVideo.upsert({
      where: { youtubeVideoId: video.youtubeVideoId },
      update: {
        // Refresh metadata that can change; never overwrite an admin's manual
        // classification/match correction once processingStatus has moved on.
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl
      },
      create: {
        youtubeVideoId: video.youtubeVideoId,
        channelTitle: video.channelTitle,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: new Date(video.publishedAt),
        discoveryQuery,
        classification,
        classificationConfidence: confidence,
        processingStatus: "DISCOVERED"
      }
    });

    saved.push({ record, suggestedMatch: identification });
  }

  return saved;
}
