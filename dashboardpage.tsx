import Link from "next/link";
import { prisma } from "@/lib/db";

const PIPELINE_STAGES = [
  "Discovered",
  "Match identified",
  "Analysis",
  "Content generated",
  "Review",
  "Approved",
  "Published"
] as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const today = startOfToday();

  const [videosToday, discovered, identified, analysesInProgress, awaitingApproval] =
    await Promise.all([
      prisma.youtubeVideo.count({ where: { discoveredAt: { gte: today } } }),
      prisma.youtubeVideo.count({ where: { processingStatus: "DISCOVERED" } }),
      prisma.youtubeVideo.count({ where: { processingStatus: "MATCH_IDENTIFIED" } }),
      prisma.analysis.count({ where: { approved: false } }),
      prisma.article.count({ where: { published: false } })
    ]);

  const stats = [
    { label: "YouTube videos discovered today", value: videosToday },
    { label: "Awaiting match ID", value: discovered },
    { label: "Match identified", value: identified },
    { label: "Analyses in progress", value: analysesInProgress },
    { label: "Content awaiting review", value: awaitingApproval }
  ];

  const latestVideos = await prisma.youtubeVideo.findMany({
    orderBy: { discoveredAt: "desc" },
    take: 5
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="border border-border bg-card p-4">
            <p className="text-2xl font-semibold text-text">{s.value}</p>
            <p className="mt-1 text-xs text-subtext">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-text">Content pipeline</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-subtext">
          {PIPELINE_STAGES.map((stage, i) => (
            <span key={stage} className="flex items-center gap-2">
              <span className="border border-border bg-card px-3 py-1.5 text-text">{stage}</span>
              {i < PIPELINE_STAGES.length - 1 && <span className="text-border">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Latest football</h2>
          <Link href="/admin/discover" className="text-xs text-accentBright hover:underline">
            Open discovery center
          </Link>
        </div>

        <div className="mt-3 divide-y divide-border border border-border bg-card">
          {latestVideos.length === 0 ? (
            <p className="p-6 text-sm text-subtext">
              No recent football videos found. Run a search in Discover to get started.
            </p>
          ) : (
            latestVideos.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{v.title}</p>
                  <p className="text-xs text-subtext">
                    {v.channelTitle} · {new Date(v.publishedAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/admin/youtube/videos/${v.id}`}
                  className="shrink-0 border border-accent px-3 py-1.5 text-xs text-accentBright hover:bg-accent/10"
                >
                  Analyze
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
