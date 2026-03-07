"use client";

import Link from "next/link";
import type { BlogDraft } from "@/types";

const TRACK_COLORS: Record<string, string> = {
  "Energy & Data Centers": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Cloud Computing": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Indigenous & Conservation":
    "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Environmental AI Governance":
    "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const STATUS_STYLES = {
  draft: "bg-white/5 text-white/50 border-white/10",
  approved: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function DraftCard({ draft }: { draft: BlogDraft }) {
  const trackColor =
    TRACK_COLORS[draft.track] || "bg-white/5 text-white/40 border-white/10";
  const statusStyle = STATUS_STYLES[draft.status];
  const date = new Date(draft.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/drafts/${encodeURIComponent(draft.id)}`}
      className="group flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:bg-white/[0.06] hover:border-white/15"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${statusStyle}`}
        >
          {draft.status}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${trackColor}`}
        >
          {draft.track}
        </span>
        <span className="ml-auto text-[11px] text-white/30">{date}</span>
      </div>

      <h3 className="text-sm font-medium leading-snug text-white/90 group-hover:text-white line-clamp-2">
        {draft.title}
      </h3>

      {draft.metaDescription && (
        <p className="text-xs text-white/40 line-clamp-2">
          {draft.metaDescription}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-white/30">
        <span>
          {draft.sourceArticles.length} source
          {draft.sourceArticles.length !== 1 ? "s" : ""}
        </span>
        <span>&middot;</span>
        <span>{draft.keywords.length} keywords</span>
      </div>
    </Link>
  );
}
