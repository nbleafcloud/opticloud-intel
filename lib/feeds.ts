import type { FeedConfig } from "@/types";

export const FEEDS: FeedConfig[] = [
  // Energy & Data Centers
  {
    url: "https://www.datacenterknowledge.com/rss.xml",
    source: "Data Center Knowledge",
    track: "Energy & Data Centers",
  },
  {
    url: "https://news.google.com/rss/search?q=data+center+energy+carbon+emissions&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: DC Energy",
    track: "Energy & Data Centers",
  },
  {
    url: "https://news.google.com/rss/search?q=green+data+center+sustainability+renewable&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: Green DC",
    track: "Energy & Data Centers",
  },

  // Cloud Computing
  {
    url: "https://www.theregister.com/headlines.atom",
    source: "The Register",
    track: "Cloud Computing",
  },
  {
    url: "https://aws.amazon.com/blogs/aws/feed/",
    source: "AWS Blog",
    track: "Cloud Computing",
  },
  {
    url: "https://news.google.com/rss/search?q=cloud+computing+regulation+compliance+sustainability&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: Cloud Policy",
    track: "Cloud Computing",
  },

  // Indigenous & Conservation
  {
    url: "https://www.culturalsurvival.org/rss.xml",
    source: "Cultural Survival",
    track: "Indigenous & Conservation",
  },
  {
    url: "https://www.iucn.org/rss.xml",
    source: "IUCN",
    track: "Indigenous & Conservation",
  },

  // Sustainable AI Policy
  {
    url: "https://www.technologyreview.com/feed/",
    source: "MIT Tech Review",
    track: "Sustainable AI Policy",
  },
  {
    url: "https://venturebeat.com/category/ai/feed/",
    source: "VentureBeat AI",
    track: "Sustainable AI Policy",
  },
  {
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    source: "The Verge AI",
    track: "Sustainable AI Policy",
  },
];
