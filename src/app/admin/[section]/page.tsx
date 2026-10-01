import Link from "next/link";
import { notFound } from "next/navigation";

const SECTIONS: Record<string, string> = {
  matches: "Matches",
  analysis: "Analysis",
  media: "Media",
  content: "Content",
  publishing: "Publishing",
  analytics: "Analytics",
  integrations: "Integrations",
  settings: "Settings"
};

export default async function AdminSectionPage({
  params
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = SECTIONS[section];
  if (!title) notFound();

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-wide text-warn">Not implemented</p>
      <h1 className="mt-1 text-xl font-semibold text-text">{title}</h1>
      <p className="mt-3 border border-border bg-card p-4 text-sm text-subtext">
        This workspace is not available yet. No data or integration status is being simulated.
      </p>
      <Link href="/admin" className="mt-5 inline-block text-sm text-accentBright hover:underline">
        Return to dashboard
      </Link>
    </div>
  );
}