"use client";

import { useState } from "react";
import { YouTubeCard, type DiscoveredVideo } from "@/components/admin/YouTubeCard";

const COMPETITION_PRESETS = [
  "Premier League",
  "Champions League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1"
];

const TEAM_PRESETS = [
  "Arsenal",
  "Chelsea",
  "Liverpool",
  "Manchester United",
  "Manchester City",
  "Real Madrid",
  "Barcelona",
  "Bayern Munich"
];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<DiscoveredVideo[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runSearch(q: string) {
    setQuery(q);
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const body = await res.json();

      if (!body.success) {
        setStatus("error");
        setErrorMessage(body.error?.message ?? "Search failed.");
        return;
      }

      setVideos(body.data.videos);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMessage("Unable to reach the search API.");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text">Latest football</h1>
      <p className="mt-1 text-sm text-subtext">
        Search YouTube for recent football content, or use a preset below.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) runSearch(query.trim());
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search competitions, teams, or anything else…"
          className="flex-1 border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="border border-accent bg-accent/10 px-4 py-2 text-sm text-accentBright hover:bg-accent/20"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {[...COMPETITION_PRESETS, ...TEAM_PRESETS].map((preset) => (
          <button
            key={preset}
            onClick={() => runSearch(preset)}
            className="border border-border px-3 py-1 text-xs text-subtext hover:border-subtext hover:text-text"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {status === "idle" && (
          <p className="text-sm text-subtext">Run a search to see results.</p>
        )}
        {status === "loading" && <p className="text-sm text-subtext">Searching…</p>}
        {status === "error" && (
          <div className="border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {errorMessage}
            <button
              onClick={() => query && runSearch(query)}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}
        {status === "done" && videos.length === 0 && (
          <p className="text-sm text-subtext">No recent football videos found for this search.</p>
        )}
        {status === "done" && videos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <YouTubeCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
