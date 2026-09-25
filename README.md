# FootballHub Analyst Studio — Phase 2

The private newsroom app. Next.js 15 (App Router, `src/`) + TypeScript +
Tailwind + Prisma, sharing the same Postgres database as FootballHub.

This delivers **Phase 2**: admin auth, the dashboard shell, and the YouTube
Discovery Center — search, dedup, keyword classification, and rule-based
match identification, all backed by real API routes and the database (no
sample data — this project talks to Postgres and the YouTube Data API from
the start).

## What's here

```
src/
  middleware.ts              protects everything under /admin
  lib/
    auth.ts                   minimal single-admin session (see note below)
    db.ts                     Prisma client singleton
    youtube.ts                YouTube Data API v3 client (search, video details)
    classification.ts          keyword classifier + rule-based match identification
    ingest.ts                  dedups + stores discovered videos
  app/
    login/page.tsx             sign-in
    admin/
      layout.tsx                sidebar + topbar shell
      page.tsx                   dashboard: today's counts, content pipeline, latest football
      discover/page.tsx          Discovery Center — search, presets, results grid
      youtube/videos/[id]/page.tsx  video workspace: watch, confirm/change match
    api/
      youtube/search/route.ts      GET — search + ingest
      youtube/videos/[id]/route.ts GET — enriched video detail
      jobs/poll-channels/route.ts  POST — channel monitoring, cron-triggered
scripts/poll-channels.ts       manual trigger for the polling job
```

## Run it

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, YOUTUBE_API_KEY, SESSION_SECRET, ADMIN_EMAIL

npm run db:push
```

Generate your admin password hash before first login:

```bash
node -e "console.log(require('./src/lib/auth').hashPassword('yourpassword'))"
```

Put the output in `ADMIN_PASSWORD_HASH`, then:

```bash
npm run dev   # http://localhost:3001
```

Sign in, open **Discover**, click a competition or team preset (or type your
own search) — this hits the real YouTube Data API and stores results, so
`YOUTUBE_API_KEY` must be set.

## Design decisions

- **Auth**: one admin account via env vars + a signed session cookie
  (`src/lib/auth.ts`), not a full provider. This satisfies §63 without
  pulling in a dependency you may want to choose yourself later (NextAuth,
  Clerk, Auth.js). Every call site uses `getSession()`/middleware, so
  swapping the implementation later doesn't touch any page or route.
- **Classification & match ID are rule-based, not AI, in this phase**
  (`src/lib/classification.ts`). Keyword regex classification and
  title-pattern team matching, both returning honest confidence scores
  and never claiming certainty — Phase 3 adds an AI-assisted pass for
  the cases these rules leave as `OTHER` / low confidence. The function
  signatures are the seam: Phase 3 can call an AI model inside
  `classifyByKeywords`'s replacement without changing any caller.
- **Quota protection**: `youtube.ts` wraps every call in Next's fetch
  cache (5 min for search, 1 hr for video details) and nothing outside
  this app can call the YouTube API directly.
- **Channel polling** is a protected POST endpoint, not a built-in
  scheduler — wire it to Vercel Cron, GitHub Actions, or any scheduler
  that can send a Bearer token.

## What's intentionally not here yet

- **Phase 3** — AI analysis, team/player analysis, content generation
  (article/Reel/Short scripts), the content editor.
- **Phase 4** — the signed publish endpoint to FootballHub.
- **Phase 5–6** — YouTube/Instagram OAuth and publishing.
- **Phase 7** — authorized video upload, FFmpeg processing.
- **Phase 8–9** — analytics, security hardening, deployment.
- `/admin/matches`, `/admin/analysis`, `/admin/media`, `/admin/content`,
  `/admin/publishing`, `/admin/analytics`, `/admin/integrations`,
  `/admin/settings` are linked from the sidebar but not built yet —
  visiting them 404s until later phases.

## Next step

Phase 3 is the natural next step: it turns a confirmed match into an
analysis workspace (AI summary, tactical breakdown, fact/observation/
inference statements) and the content generator. Say the word and I'll
build it the same way — real files, wired to this same database.
