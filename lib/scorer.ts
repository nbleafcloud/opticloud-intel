import type { Article, Priority } from "@/types";
import { HIGH_KEYWORDS, LOW_KEYWORDS, isAuthoritativeSource } from "./scoring-rules";

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function scoreOne(article: Article): Priority {
  // Authoritative source override — always HIGH regardless of keywords
  if (isAuthoritativeSource(article.link, article.source)) return "HIGH";

  const text = `${article.title} ${article.description}`.toLowerCase();
  if (matchesAny(text, HIGH_KEYWORDS)) return "HIGH";
  if (matchesAny(text, LOW_KEYWORDS)) return "LOW";
  return "MEDIUM";
}

const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function scoreAndSort(articles: Article[]): Promise<Article[]> {
  const scored = articles.map((a) => ({ ...a, priority: scoreOne(a) }));

  return scored.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}
