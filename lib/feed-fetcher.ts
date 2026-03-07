import Parser from "rss-parser";
import { FEEDS } from "./feeds.js";
import { scoreArticle, normalizeTitle } from "./scoring-rules.js";
import type { Priority } from "../types/index.js";

export interface FetchedArticle {
  title: string;
  description: string;
  link: string;
  source: string;
  track: string;
  priority: Priority;
  pubDate: string;
}

interface FetchOptions {
  maxAgeMs: number;
  minPriority?: Priority;  // "HIGH" = only HIGH, "MEDIUM" = HIGH+MEDIUM, "LOW" = all
  descriptionMaxLength?: number;
}

export async function fetchAndScoreArticles(options: FetchOptions): Promise<FetchedArticle[]> {
  const { maxAgeMs, minPriority = "LOW", descriptionMaxLength = 300 } = options;
  const parser = new Parser({ timeout: 10000 });
  const articles: FetchedArticle[] = [];
  const seenTitles = new Set<string>();
  const now = Date.now();

  const priorityRank: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const minRank = priorityRank[minPriority];

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const result = await parser.parseURL(feed.url);
        for (const item of (result.items || []).slice(0, 15)) {
          const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
          const age = now - new Date(pubDate).getTime();
          if (age > maxAgeMs) continue;

          const title = item.title || "";
          const titleKey = normalizeTitle(title);
          if (seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);

          const description = (item.contentSnippet || item.content || "")
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, descriptionMaxLength);
          const link = item.link || feed.url;
          const priority = scoreArticle(title, description, link, feed.source);

          if (priorityRank[priority] >= minRank) {
            articles.push({ title, description, link, source: feed.source, track: feed.track, priority, pubDate });
          }
        }
      } catch (err) {
        console.warn(`Feed fetch failed for ${feed.source} (${feed.url}):`, err instanceof Error ? err.message : err);
      }
    })
  );

  return articles;
}
