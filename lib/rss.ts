import Parser from "rss-parser";
import type { Article } from "@/types";
import { FEEDS, type FeedConfig } from "./feeds";

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "OpticloudIntel/1.0" },
});

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
const NEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;  // 24 hours = "NEW" badge

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(feed: FeedConfig): Promise<Article[]> {
  try {
    const result = await parser.parseURL(feed.url);
    const now = Date.now();

    return (result.items || [])
      .slice(0, 15)
      .map((item) => {
        const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
        const age = now - new Date(pubDate).getTime();
        return {
          id: `${feed.source}-${item.guid || item.link || item.title}`,
          title: item.title ? stripHtml(item.title) : "Untitled",
          description: item.contentSnippet
            ? stripHtml(item.contentSnippet).slice(0, 300)
            : item.summary
            ? stripHtml(item.summary).slice(0, 300)
            : "",
          link: item.link || "#",
          pubDate,
          source: feed.source,
          track: feed.track,
          priority: "MEDIUM" as const,
          isNew: age < NEW_THRESHOLD_MS,
        };
      })
      .filter((article) => {
        const age = now - new Date(article.pubDate).getTime();
        return age <= MAX_AGE_MS;
      });
  } catch {
    console.warn(`Failed to fetch ${feed.source}: ${feed.url}`);
    return [];
  }
}

export async function fetchAllFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Deduplicate by normalized title — keep first occurrence
  const seen = new Set<string>();
  return all.filter((article) => {
    const key = normalizeTitle(article.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
