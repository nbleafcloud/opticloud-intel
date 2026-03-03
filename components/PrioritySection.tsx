import type { Article, Priority } from "@/types";
import ArticleCard from "./ArticleCard";

const SECTION_CONFIG: Record<
  Priority,
  { label: string; accent: string; countBg: string }
> = {
  HIGH: {
    label: "High Priority",
    accent: "text-red-400",
    countBg: "bg-red-500/10 text-red-400",
  },
  MEDIUM: {
    label: "Medium Priority",
    accent: "text-amber-400",
    countBg: "bg-amber-400/10 text-amber-400",
  },
  LOW: {
    label: "Low Priority",
    accent: "text-emerald-400",
    countBg: "bg-emerald-500/10 text-emerald-400",
  },
};

export default function PrioritySection({
  priority,
  articles,
}: {
  priority: Priority;
  articles: Article[];
}) {
  if (articles.length === 0) return null;
  const cfg = SECTION_CONFIG[priority];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className={`text-xs font-semibold tracking-widest uppercase ${cfg.accent}`}>
          {cfg.label}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.countBg}`}>
          {articles.length}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
