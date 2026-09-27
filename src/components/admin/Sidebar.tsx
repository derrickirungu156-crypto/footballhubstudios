import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/discover", label: "Discover" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/analysis", label: "Analysis" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/publishing", label: "Publishing" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/settings", label: "Settings" }
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">
      <div className="px-5 py-5">
        <p className="text-sm font-semibold text-text">FootballHub</p>
        <p className="text-xs text-subtext">Analyst Studio</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded px-3 py-2 text-sm text-subtext transition-colors hover:bg-card hover:text-text"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
