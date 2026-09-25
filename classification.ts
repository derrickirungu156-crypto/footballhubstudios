import { prisma } from "./db";

// §28 — classify discovered videos. This is a deliberately simple keyword
// pass so discovery works with zero AI cost. Phase 3 replaces/augments this
// with an AI call for ambiguous cases — the call site (ingestVideo below)
// is the seam: swap classifyByKeywords() for an AI-assisted version without
// touching anything else.

export type VideoClassification =
  | "MATCH_HIGHLIGHT"
  | "GOAL_HIGHLIGHT"
  | "MATCH_REPORT"
  | "FOOTBALL_NEWS"
  | "POST_MATCH"
  | "PRESS_CONFERENCE"
  | "TACTICAL_ANALYSIS"
  | "TRANSFER_NEWS"
  | "PLAYER_CONTENT"
  | "OTHER";

const RULES: Array<{ classification: VideoClassification; patterns: RegExp[] }> = [
  { classification: "GOAL_HIGHLIGHT", patterns: [/\ball goals?\b/i, /\bgoals?\s*&\s*highlights\b/i] },
  { classification: "MATCH_HIGHLIGHT", patterns: [/\bhighlights\b/i, /\bfull match\b/i] },
  { classification: "PRESS_CONFERENCE", patterns: [/\bpress conference\b/i, /\bpre-?match interview\b/i] },
  { classification: "POST_MATCH", patterns: [/\bpost-?match\b/i, /\breaction\b/i] },
  { classification: "TACTICAL_ANALYSIS", patterns: [/\btactical\b/i, /\btactics\b/i, /\banalysis\b/i] },
  { classification: "TRANSFER_NEWS", patterns: [/\btransfer\b/i, /\bsigns for\b/i, /\bdeal agreed\b/i] },
  { classification: "MATCH_REPORT", patterns: [/\bmatch report\b/i, /\brecap\b/i] },
  { classification: "FOOTBALL_NEWS", patterns: [/\bnews\b/i, /\bbreaking\b/i] }
];

export function classifyByKeywords(title: string, description: string): {
  classification: VideoClassification;
  confidence: number;
} {
  const text = `${title} ${description}`;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      // Keyword match gives a moderate, honest confidence — never claim certainty
      // from a regex (§28: "do not classify with certainty when uncertain").
      return { classification: rule.classification, confidence: 0.6 };
    }
  }
  return { classification: "OTHER", confidence: 0.3 };
}

// §29 — attempt to identify home/away team + competition from title/description
// against the known Team table. This is intentionally conservative: it only
// returns a match when exactly one home and one away team are found, and
// leaves everything else to manual confirmation in the admin UI.

export interface MatchIdentificationResult {
  homeTeamSlug: string | null;
  awayTeamSlug: string | null;
  confidence: number;
}

export async function identifyMatchFromText(title: string, description: string): Promise<MatchIdentificationResult> {
  const teams = await prisma.team.findMany({ select: { name: true, slug: true } });
  const text = `${title} ${description}`.toLowerCase();

  const mentioned = teams.filter((t) => text.includes(t.name.toLowerCase()));

  // Prefer the "X vs Y" / "X v Y" pattern to get home/away order right.
  const vsMatch = /([a-z\s]+?)\s+(?:vs\.?|v)\s+([a-z\s]+?)(?:\s|:|\||$)/i.exec(title);
  if (vsMatch) {
    const [, left, right] = vsMatch;
    const home = teams.find((t) => left.toLowerCase().includes(t.name.toLowerCase()));
    const away = teams.find((t) => right.toLowerCase().includes(t.name.toLowerCase()));
    if (home && away && home.slug !== away.slug) {
      return { homeTeamSlug: home.slug, awayTeamSlug: away.slug, confidence: 0.85 };
    }
  }

  if (mentioned.length === 2) {
    return {
      homeTeamSlug: mentioned[0]!.slug,
      awayTeamSlug: mentioned[1]!.slug,
      confidence: 0.5 // order unknown — admin must confirm which side is home
    };
  }

  return { homeTeamSlug: null, awayTeamSlug: null, confidence: 0 };
}
