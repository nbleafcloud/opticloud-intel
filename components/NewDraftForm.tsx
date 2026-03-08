"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS } from "@/lib/feeds";
import type { Track } from "@/types";

export default function NewDraftForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [keyArguments, setKeyArguments] = useState("");
  const [track, setTrack] = useState(TRACKS[0]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, angle, keyArguments, track }),
      });

      if (!res.ok) {
        let errorMessage = "Generation failed";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // response body wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const { id } = await res.json();
      router.push(`/drafts/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/20"
      >
        + New Draft
      </button>
    );
  }

  return (
    <form
      onSubmit={handleGenerate}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">
          Generate New Draft
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-white/30 hover:text-white/60 transition"
        >
          Cancel
        </button>
      </div>

      <div>
        <label htmlFor="draft-topic" className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Topic / Title
        </label>
        <input
          id="draft-topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={200}
          required
          placeholder="Beyond the GPU: Why Digital Sanitation is Critical for the GB200 Era"
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition placeholder:text-white/20"
        />
      </div>

      <div>
        <label htmlFor="draft-angle" className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Angle
        </label>
        <input
          id="draft-angle"
          type="text"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          maxLength={500}
          required
          placeholder="NVIDIA is shifting from chip supplier to full-stack infrastructure provider..."
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition placeholder:text-white/20"
        />
      </div>

      <div>
        <label htmlFor="draft-arguments" className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Key Arguments
        </label>
        <textarea
          id="draft-arguments"
          value={keyArguments}
          onChange={(e) => setKeyArguments(e.target.value)}
          maxLength={1000}
          required
          rows={3}
          placeholder="Explain how OptiCloud's software ensures next-gen chips aren't wasting cycles on zombie data..."
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition resize-y placeholder:text-white/20"
        />
      </div>

      <div>
        <label htmlFor="draft-track" className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Track
        </label>
        <select
          id="draft-track"
          value={track}
          onChange={(e) => setTrack(e.target.value as Track)}
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition"
        >
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={generating}
        className="w-full rounded-lg border border-orange-500/30 bg-orange-500/15 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? "Generating (~30s)..." : "Generate Draft"}
      </button>
    </form>
  );
}
