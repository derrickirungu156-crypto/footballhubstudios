// Server-only YouTube Data API v3 client.
//
// Quota protection (§25, §79): every call is wrapped in Next's fetch cache
// with a tag so admin UI hits can share results, and no public FootballHub
// page ever calls this module directly — only Studio's API routes/admin
// pages do. Search results are revalidated on an interval, not on every
// request.

const API_BASE = process.env.YOUTUBE_API_BASE_URL ?? "https://www.googleapis.com/youtube/v3";
const SEARCH_CACHE_SECONDS = 300; // 5 min — recent uploads move fast, don't cache too long
const VIDEO_CACHE_SECONDS = 3600; // video metadata changes slowly once published

export class YoutubeApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "YoutubeApiError";
  }
}

function requireApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YoutubeApiError("YOUTUBE_API_KEY is not configured.");
  return key;
}

export interface YoutubeSearchResult {
  youtubeVideoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YoutubeVideoDetails extends YoutubeSearchResult {
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
}

/**
 * Search recent football content. Use for the "Latest football" discovery
 * screen and custom/team/competition searches (§24).
 */
export async function searchFootballVideos(params: {
  query: string;
  publishedAfter?: string; // ISO 8601
  channelId?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ results: YoutubeSearchResult[]; nextPageToken?: string }> {
  const key = requireApiKey();
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("key", key);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("q", params.query);
  url.searchParams.set("maxResults", String(params.maxResults ?? 25));
  if (params.publishedAfter) url.searchParams.set("publishedAfter", params.publishedAfter);
  if (params.channelId) url.searchParams.set("channelId", params.channelId);
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  const res = await fetch(url.toString(), {
    next: { revalidate: SEARCH_CACHE_SECONDS, tags: ["youtube-search"] }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YoutubeApiError(`YouTube search failed: ${res.status} ${body}`, res.status);
  }

  const data = await res.json();

  const results: YoutubeSearchResult[] = (data.items ?? []).map((item: any) => ({
    youtubeVideoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      ""
  }));

  return { results, nextPageToken: data.nextPageToken };
}

/**
 * Fetch statistics/duration for a batch of video IDs (max 50 per call —
 * the API's own limit). Used to enrich search results and for the
 * discovery detail view.
 */
export async function getVideoDetails(videoIds: string[]): Promise<YoutubeVideoDetails[]> {
  if (videoIds.length === 0) return [];
  const key = requireApiKey();
  const url = new URL(`${API_BASE}/videos`);
  url.searchParams.set("key", key);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("id", videoIds.slice(0, 50).join(","));

  const res = await fetch(url.toString(), {
    next: { revalidate: VIDEO_CACHE_SECONDS, tags: ["youtube-video-details"] }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YoutubeApiError(`YouTube video lookup failed: ${res.status} ${body}`, res.status);
  }

  const data = await res.json();

  return (data.items ?? []).map((item: any) => ({
    youtubeVideoId: item.id,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      "",
    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
    likeCount: item.statistics?.likeCount ? Number(item.statistics.likeCount) : null,
    commentCount: item.statistics?.commentCount ? Number(item.statistics.commentCount) : null
  }));
}

/** Parses ISO 8601 durations like "PT4M32S" into whole seconds. */
function parseIsoDuration(iso?: string): number | null {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}
