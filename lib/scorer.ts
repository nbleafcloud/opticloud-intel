import type { Article, Priority } from "@/types";

const HIGH_KEYWORDS = [
  "itu", "iso", "l.1801", "regulation", "mandate", "mandates", "mandated",
  "legislation", "law", "directive", "compliance", "enforcement", "penalty",
  "penalties", "fine", "fines", "ban", "banned", "prohibited", "required",
  "obligation", "obligatory", "eu ai act", "executive order", "government order",
  "federal rule", "federal ruling", "nist framework", "standard published",
  "new standard", "ratified", "ratification", "treaty", "signed into law",
  "carbon tax", "emissions cap", "data sovereignty law", "fpic", "rights violation",
];

const LOW_KEYWORDS = [
  "opinion", "editorial", "commentary", "analysis:", "how to", "explainer",
  "what is", "primer", "guide to", "review:", "podcast", "webinar", "event:",
  "job posting", "hiring", "sponsored", "press release", "award", "awards",
  "ranking", "top 10", "top 5", "listicle",
];

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function scoreOne(article: Article): Priority {
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
