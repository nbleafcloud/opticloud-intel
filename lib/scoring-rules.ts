// Shared scoring logic — imported by lib/scorer.ts, daily-digest.mts, and blog-writer.mts

export const HIGH_KEYWORDS = [
  "itu", "iso", "l.1801", "regulation", "mandate", "mandates", "mandated",
  "legislation", "law", "directive", "compliance", "enforcement", "penalty",
  "penalties", "fine", "fines", "ban", "banned", "prohibited", "required",
  "obligation", "obligatory", "eu ai act", "executive order", "government order",
  "federal rule", "federal ruling", "nist framework", "standard published",
  "new standard", "ratified", "ratification", "treaty", "signed into law",
  "carbon tax", "emissions cap", "data sovereignty law", "fpic", "rights violation",
  "environmental ai", "ai footprint", "ai energy standard", "ai carbon standard",
  "un ai", "ieee ai", "itu-t", "ai governance standard", "advisory body",
  "working group published", "international standard", "ai sustainability standard",
  "green ai policy", "ai environmental impact", "scope 3", "ai act",
  "energy efficiency standard",
];

export const LOW_KEYWORDS = [
  "opinion", "editorial", "commentary", "analysis:", "how to", "explainer",
  "what is", "primer", "guide to", "review:", "podcast", "webinar", "event:",
  "job posting", "hiring", "sponsored", "press release", "award", "awards",
  "ranking", "top 10", "top 5", "listicle",
];

// Publications from these domains are automatically authoritative → always HIGH priority
export const AUTHORITATIVE_DOMAINS = [
  "itu.int", "un.org", "iso.org", "europa.eu", "ieee.org",
  "nist.gov", "whitehouse.gov", "congress.gov", "gov.uk",
  "oecd.org", "weforum.org", "iea.org", "ipcc.ch",
  "unesco.org", "wipo.int", "iucn.org",
];

export function isAuthoritativeSource(link: string, source: string): boolean {
  const combined = `${link} ${source}`.toLowerCase();
  return AUTHORITATIVE_DOMAINS.some((domain) => combined.includes(domain));
}

function matchesKeyword(text: string, keyword: string): boolean {
  // Use word boundary for single words, exact match for phrases
  if (keyword.includes(" ")) return text.includes(keyword);
  return new RegExp(`\\b${keyword}\\b`).test(text);
}

export function scoreArticle(
  title: string,
  description: string,
  link: string,
  source: string
): "HIGH" | "MEDIUM" | "LOW" {
  if (isAuthoritativeSource(link, source)) return "HIGH";
  const text = `${title} ${description}`.toLowerCase();
  if (HIGH_KEYWORDS.some((k) => matchesKeyword(text, k))) return "HIGH";
  if (LOW_KEYWORDS.some((k) => matchesKeyword(text, k))) return "LOW";
  return "MEDIUM";
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
