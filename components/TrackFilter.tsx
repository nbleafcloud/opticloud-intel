"use client";

import { useState, useTransition } from "react";
import type { Track } from "@/types";

const TRACKS: Track[] = [
  "Energy & Data Centers",
  "Cloud Computing",
  "Indigenous & Conservation",
  "Environmental AI Governance",
];

const TRACK_STYLES: Record<Track, { active: string; inactive: string }> = {
  "Energy & Data Centers": {
    active: "border-blue-500/50 bg-blue-500/15 text-blue-300",
    inactive: "border-white/8 text-white/40 hover:border-blue-500/30 hover:text-blue-300/70",
  },
  "Cloud Computing": {
    active: "border-purple-500/50 bg-purple-500/15 text-purple-300",
    inactive: "border-white/8 text-white/40 hover:border-purple-500/30 hover:text-purple-300/70",
  },
  "Indigenous & Conservation": {
    active: "border-teal-500/50 bg-teal-500/15 text-teal-300",
    inactive: "border-white/8 text-white/40 hover:border-teal-500/30 hover:text-teal-300/70",
  },
  "Environmental AI Governance": {
    active: "border-orange-500/50 bg-orange-500/15 text-orange-300",
    inactive: "border-white/8 text-white/40 hover:border-orange-500/30 hover:text-orange-300/70",
  },
};

interface TrackFilterProps {
  onFilterChange: (tracks: Track[]) => void;
}

export default function TrackFilter({ onFilterChange }: TrackFilterProps) {
  const [active, setActive] = useState<Track[]>([...TRACKS]);
  const [, startTransition] = useTransition();

  function toggle(track: Track) {
    startTransition(() => {
      setActive((prev) => {
        const next =
          prev.includes(track)
            ? prev.length === 1
              ? [...TRACKS] // reset to all if last one deselected
              : prev.filter((t) => t !== track)
            : [...prev, track];
        onFilterChange(next);
        return next;
      });
    });
  }

  function selectAll() {
    setActive([...TRACKS]);
    onFilterChange([...TRACKS]);
  }

  const isAll = active.length === TRACKS.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={selectAll}
        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
          isAll
            ? "border-white/20 bg-white/10 text-white"
            : "border-white/8 text-white/40 hover:border-white/20 hover:text-white/70"
        }`}
      >
        All tracks
      </button>
      {TRACKS.map((track) => {
        const isActive = active.includes(track) && !isAll;
        const style = TRACK_STYLES[track];
        return (
          <button
            key={track}
            onClick={() => toggle(track)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
              isActive ? style.active : style.inactive
            }`}
          >
            {track}
          </button>
        );
      })}
    </div>
  );
}
