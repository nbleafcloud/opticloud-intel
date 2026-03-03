import Parser from "rss-parser";
import type { Article, FeedConfig } from "@/types";
import { FEEDS } from "./feeds";

const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "OpticloudIntel/1.0" },
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchFeed(feed: FeedConfig): Promise<Article[]> {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).slice(0, 10).map((item) => ({
      id: `${feed.source}-${item.guid || item.link || item.title}`,
      title: item.title ? stripHtml(item.title) : "Untitled",
      description: item.contentSnippet
        ? stripHtml(item.contentSnippet).slice(0, 300)
        : item.summary
        ? stripHtml(item.summary).slice(0, 300)
        : "",
      link: item.link || "#",
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      source: feed.source,
      track: feed.track,
      priority: "MEDIUM" as const, // placeholder until scored
    }));
  } catch {
    console.warn(`Failed to fetch ${feed.source}: ${feed.url}`);
    return [];
  }
}

export async function fetchAllFeeds(): Promise<Article[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  return results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}
