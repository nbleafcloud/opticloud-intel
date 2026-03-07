"use client";

import Link from "next/link";
import type { BlogDraft } from "@/types";

const TRACK_COLORS: Record<string, string> = {
  "Energy & Data Centers": "text-blue-400",
  "Cloud Computing": "text-purple-400",
  "Indigenous & Conservation": "text-teal-400",
  "Environmental AI Governance": "text-orange-400",
};

export default function BlogPostCard({ post }: { post: BlogDraft }) {
  const trackColor = TRACK_COLORS[post.track] || "text-white/40";
  const readTime = Math.max(
    1,
    Math.ceil(post.content.split(/\s+/).length / 200)
  );
  const publishDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-xl border border-white/8 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.06] hover:border-white/15"
    >
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-white/30">{publishDate}</span>
        <span className="text-white/15">&middot;</span>
        <span className="text-white/30">{readTime} min read</span>
        <span className="text-white/15">&middot;</span>
        <span className={trackColor}>{post.track}</span>
      </div>

      <h2 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors mb-2 leading-snug">
        {post.title}
      </h2>

      {post.metaDescription && (
        <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
          {post.metaDescription}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {post.keywords.slice(0, 4).map((kw) => (
          <span
            key={kw}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40"
          >
            {kw}
          </span>
        ))}
      </div>
    </Link>
  );
}
