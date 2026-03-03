"use client";

import { useState } from "react";
import type { Article, Track } from "@/types";
import PrioritySection from "./PrioritySection";
import TrackFilter from "./TrackFilter";

const TRACKS: Track[] = [
  "Energy & Data Centers",
  "Cloud Computing",
  "Indigenous & Conservation",
  "Environmental AI Governance",
];

export default function FeedClient({ articles }: { articles: Article[] }) {
  const [activeTracks, setActiveTracks] = useState<Track[]>([...TRACKS]);

  const filtered = articles.filter((a) => activeTracks.includes(a.track));

  const high = filtered.filter((a) => a.priority === "HIGH");
  const medium = filtered.filter((a) => a.priority === "MEDIUM");
  const low = filtered.filter((a) => a.priority === "LOW");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TrackFilter onFilterChange={setActiveTracks} />
        <span className="text-xs text-white/40">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-white/30 text-sm">
          No articles found for selected tracks.
        </div>
      ) : (
        <>
          <PrioritySection priority="HIGH" articles={high} />
          <PrioritySection priority="MEDIUM" articles={medium} />
          <PrioritySection priority="LOW" articles={low} />
        </>
      )}
    </div>
  );
}
