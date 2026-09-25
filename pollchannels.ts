// Run with: npm run poll:channels
// Hits the same endpoint your production scheduler (Vercel Cron, etc.) will call.
const url = `${process.env.ANALYST_STUDIO_URL ?? "http://localhost:3001"}/api/jobs/poll-channels`;

async function main() {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.JOBS_SECRET ?? ""}` }
  });
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
