import type { Article, Priority, Track } from "@/types";

const PRIORITY_CONFIG: Record<
  Priority,
  { dot: string; badge: string; border: string; glow: string; label: string }
> = {
  HIGH: {
    dot: "bg-red-500 animate-pulse",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    border: "border-red-500/20 hover:border-red-500/40",
    glow: "hover:shadow-red-500/5",
    label: "HIGH",
  },
  MEDIUM: {
    dot: "bg-amber-400",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    border: "border-amber-400/10 hover:border-amber-400/30",
    glow: "hover:shadow-amber-400/5",
    label: "MED",
  },
  LOW: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    border: "border-white/8 hover:border-white/15",
    glow: "hover:shadow-none",
    label: "LOW",
  },
};

const TRACK_COLORS: Record<Track, string> = {
  "Energy & Data Centers": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Cloud Computing": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Indigenous & Conservation": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Environmental AI Governance": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ArticleCard({ article }: { article: Article }) {
  const p = PRIORITY_CONFIG[article.priority];

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-3 rounded-xl border bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.06] hover:shadow-lg ${p.border} ${p.glow}`}
    >
      {/* Top row: priority + track */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${p.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TRACK_COLORS[article.track]}`}
        >
          {article.track}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium leading-snug text-white/90 group-hover:text-white line-clamp-2 transition-colors">
        {article.title}
      </h3>

      {/* Description */}
      {article.description && (
        <p className="text-xs leading-relaxed text-white/40 line-clamp-2">
          {article.description}
        </p>
      )}

      {/* Footer: source + time */}
      <div className="flex items-center justify-between text-[11px] text-white/30">
        <span className="font-medium">{article.source}</span>
        <span>{timeAgo(article.pubDate)}</span>
      </div>
    </a>
  );
}
