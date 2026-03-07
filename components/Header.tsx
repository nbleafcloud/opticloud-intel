"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface HeaderProps {
  articleCount?: number;
  lastUpdated?: string;
}

const NAV_LINKS = [
  { href: "/", label: "Intel" },
  { href: "/drafts", label: "Drafts" },
  { href: "/blog", label: "Blog" },
];

export default function Header({ articleCount, lastUpdated }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch("/api/refresh", { method: "POST" });
    router.refresh();
    setRefreshing(false);
  }

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">
                Opticloud
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">
                Intel
              </span>
            </div>
            <p className="text-[11px] text-white/30 mt-0.5">{date}</p>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {articleCount !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{articleCount} articles</span>
            </div>
          )}
          {lastUpdated && (
            <div className="hidden sm:block text-xs text-white/30">
              Updated {lastUpdated}
            </div>
          )}
          {pathname === "/" && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <svg
                className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
