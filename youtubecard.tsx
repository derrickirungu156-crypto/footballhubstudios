import Link from "next/link";
import Image from "next/image";

export interface DiscoveredVideo {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  classification: string;
  classificationConfidence: number | null;
  suggestedMatch?: { homeTeamSlug: string | null; awayTeamSlug: string | null; confidence: number };
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function YouTubeCard({ video }: { video: DiscoveredVideo }) {
  return (
    <div className="border border-border bg-card">
      <div className="relative aspect-video bg-base">
        {video.thumbnailUrl && (
          <Image src={video.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        )}
        <span className="absolute left-2 top-2 border border-border bg-base/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-subtext">
          {video.classification.replace(/_/g, " ")}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm text-text">{video.title}</p>
        <p className="mt-1 text-xs text-subtext">
          {video.channelTitle} · {timeAgo(video.publishedAt)}
        </p>

        {video.suggestedMatch?.homeTeamSlug && video.suggestedMatch?.awayTeamSlug ? (
          <p className="mt-2 text-xs text-accentBright">
            Detected match · {Math.round(video.suggestedMatch.confidence * 100)}% confidence
          </p>
        ) : (
          <p className="mt-2 text-xs text-subtext">Match not confidently identified</p>
        )}

        <div className="mt-3 flex gap-2">
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 border border-border px-2 py-1.5 text-center text-xs text-text hover:border-subtext"
          >
            Watch
          </a>
          <Link
            href={`/admin/youtube/videos/${video.id}`}
            className="flex-1 border border-accent bg-accent/10 px-2 py-1.5 text-center text-xs text-accentBright hover:bg-accent/20"
          >
            Analyze
          </Link>
        </div>
      </div>
    </div>
  );
}
