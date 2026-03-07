"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { TRACK_TEXT_COLORS } from "@/types";
import type { BlogDraft } from "@/types";

export default function DraftEditor({
  draft: initial,
}: {
  draft: BlogDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update(fields: Partial<BlogDraft>) {
    setDraft((d) => ({ ...d, ...fields }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          metaDescription: draft.metaDescription,
          content: draft.content,
          keywords: draft.keywords,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved");
    } catch {
      setMessage("Failed to save");
    }
    setSaving(false);
  }

  async function handleApprove() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Approve failed");
      setDraft((d) => ({ ...d, status: "approved" }));
      setMessage("Approved");
    } catch {
      setMessage("Failed to approve");
    }
    setSaving(false);
  }

  async function handlePublish() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/drafts/${encodeURIComponent(draft.id)}/publish`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Publish failed");
      }
      setDraft((d) => ({
        ...d,
        status: "published",
        publishedAt: new Date().toISOString(),
      }));
      setMessage("Published!");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to publish"
      );
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this draft permanently?")) return;
    setSaving(true);
    try {
      await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
      });
      router.push("/drafts");
    } catch {
      setMessage("Failed to delete");
      setSaving(false);
    }
  }

  const trackColor = TRACK_TEXT_COLORS[draft.track] || "text-white/40";

  return (
    <div>
      {/* Top bar with status + actions */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => router.push("/drafts")}
          className="text-xs text-white/40 hover:text-white/70 transition"
        >
          &larr; Back to drafts
        </button>
        <span className="h-4 w-px bg-white/10" />
        <span className={`text-xs font-medium ${trackColor}`}>
          {draft.track}
        </span>
        <span className="text-xs text-white/30 uppercase tracking-wider">
          {draft.status}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {message && (
            <span className={`text-xs ${message.toLowerCase().includes("fail") ? "text-red-400" : "text-emerald-400"}`}>{message}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 disabled:opacity-50"
          >
            Save
          </button>
          {draft.status === "draft" && (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-400 transition hover:bg-amber-400/20 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {draft.status === "approved" && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Publish
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        className="w-full bg-transparent text-xl font-semibold text-white/90 border-none outline-none mb-4 placeholder:text-white/20"
        placeholder="Post title..."
      />

      {/* Meta description */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-white/30 uppercase tracking-wider">
            Meta Description
          </label>
          <span
            className={`text-[10px] ${draft.metaDescription.length > 160 ? "text-red-400" : "text-white/30"}`}
          >
            {draft.metaDescription.length}/160
          </span>
        </div>
        <input
          type="text"
          value={draft.metaDescription}
          onChange={(e) => update({ metaDescription: e.target.value })}
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition"
          placeholder="SEO meta description..."
        />
      </div>

      {/* Keywords */}
      <div className="mb-6">
        <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Keywords
        </label>
        <input
          type="text"
          value={draft.keywords.join(", ")}
          onChange={(e) =>
            update({
              keywords: e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition"
          placeholder="keyword1, keyword2, keyword3"
        />
      </div>

      {/* Two-column editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">
            Content (Markdown)
          </label>
          <textarea
            value={draft.content}
            onChange={(e) => update({ content: e.target.value })}
            className="w-full h-[500px] bg-white/[0.03] border border-white/8 rounded-lg px-4 py-3 text-sm text-white/70 font-mono leading-relaxed outline-none focus:border-white/20 transition resize-y"
            placeholder="## Write your blog post here..."
          />
        </div>

        {/* Preview */}
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">
            Preview
          </label>
          <div className="bg-white/[0.02] border border-white/8 rounded-lg px-6 py-4 h-[500px] overflow-y-auto prose-custom">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {draft.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Source articles */}
      {draft.sourceArticles.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/8">
          <h3 className="text-[10px] text-white/30 uppercase tracking-wider mb-3">
            Source Articles
          </h3>
          <ul className="space-y-2">
            {draft.sourceArticles.map((src) => (
              <li key={src.link} className="flex items-center gap-2">
                <a
                  href={src.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-400 hover:text-orange-300 transition"
                >
                  {src.title}
                </a>
                <span className="text-xs text-white/30">— {src.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
