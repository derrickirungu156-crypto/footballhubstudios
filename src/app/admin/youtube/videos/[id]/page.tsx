import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { identifyMatchFromText } from "@/lib/classification";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function confirmMatch(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;

  const videoId = String(formData.get("videoId"));
  const homeTeamSlug = String(formData.get("homeTeamSlug"));
  const awayTeamSlug = String(formData.get("awayTeamSlug"));
  const matchDate = String(formData.get("matchDate"));

  if (homeTeamSlug === awayTeamSlug || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) return;

  const kickoffAt = new Date(`${matchDate}T00:00:00.000Z`);
  if (Number.isNaN(kickoffAt.getTime()) || kickoffAt.toISOString().slice(0, 10) !== matchDate) return;

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.findUnique({ where: { slug: homeTeamSlug } }),
    prisma.team.findUnique({ where: { slug: awayTeamSlug } })
  ]);
  if (!homeTeam || !awayTeam) return;

  const video = await prisma.youtubeVideo.findUnique({ where: { id: videoId } });
  if (!video) return;

  const slug = `${homeTeam.slug}-vs-${awayTeam.slug}-${matchDate}`;

  const match = await prisma.match.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      status: "UNKNOWN",
      source: "MANUAL",
      kickoffAt
    }
  });

  await prisma.youtubeVideo.update({
    where: { id: videoId },
    data: { matchId: match.id, processingStatus: "MATCH_IDENTIFIED" }
  });

  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "MATCH_CONFIRMED",
      objectType: "YoutubeVideo",
      objectId: videoId,
      result: "SUCCESS"
    }
  });

  revalidatePath(`/admin/youtube/videos/${videoId}`);
}

export default async function VideoWorkspacePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await prisma.youtubeVideo.findUnique({ where: { id }, include: { match: true } });
  if (!video) notFound();

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const suggestion = video.matchId
    ? null
    : await identifyMatchFromText(video.title, video.description);

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-wide text-subtext">{video.classification.replace(/_/g, " ")}</p>
      <h1 className="mt-1 text-xl font-semibold text-text">{video.title}</h1>
      <p className="mt-1 text-sm text-subtext">
        {video.channelTitle} · {new Date(video.publishedAt).toLocaleString()}
      </p>

      <a
        href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block border border-border px-3 py-1.5 text-xs text-text hover:border-subtext"
      >
        Watch on YouTube
      </a>

      <section className="mt-8 border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-text">Match identification</h2>

        {video.match ? (
          <p className="mt-3 text-sm text-accentBright">
            Confirmed — this video is linked to a match record.
          </p>
        ) : (
          <>
            {suggestion?.homeTeamSlug && suggestion?.awayTeamSlug ? (
              <p className="mt-2 text-sm text-subtext">
                Detected match · {Math.round(suggestion.confidence * 100)}% confidence. Confirm or
                change the teams below.
              </p>
            ) : (
              <p className="mt-2 text-sm text-subtext">Match not confidently identified. Select teams manually.</p>
            )}

            <form action={confirmMatch} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="videoId" value={video.id} />

              <p className="basis-full text-xs text-subtext">
                The YouTube upload date is not treated as the match date. Enter the verified fixture date.
              </p>

              <label className="text-xs text-subtext">
                Home team
                <select
                  name="homeTeamSlug"
                  defaultValue={suggestion?.homeTeamSlug ?? ""}
                  className="mt-1 block border border-border bg-base px-2 py-1.5 text-sm text-text"
                >
                  <option value="" disabled>Select…</option>
                  {teams.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-subtext">
                Away team
                <select
                  name="awayTeamSlug"
                  defaultValue={suggestion?.awayTeamSlug ?? ""}
                  className="mt-1 block border border-border bg-base px-2 py-1.5 text-sm text-text"
                >
                  <option value="" disabled>Select…</option>
                  {teams.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-subtext">
                Match date
                <input
                  name="matchDate"
                  type="date"
                  required
                  className="mt-1 block border border-border bg-base px-2 py-1.5 text-sm text-text"
                />
              </label>

              <button
                type="submit"
                className="border border-accent bg-accent/10 px-4 py-1.5 text-sm text-accentBright hover:bg-accent/20"
              >
                Confirm match
              </button>
            </form>
          </>
        )}
      </section>

      <section className="mt-6 border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-text">Next step</h2>
        <p className="mt-2 text-sm text-subtext">
          {video.match
            ? "Generate an analysis workspace for this match — arrives in Phase 3."
            : "Confirm the match above to unlock analysis."}
        </p>
      </section>
    </div>
  );
}
