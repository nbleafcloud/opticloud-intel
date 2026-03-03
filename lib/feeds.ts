export interface FeedConfig {
  url: string;
  source: string;
  track: TrackName;
}

export type TrackName =
  | "Energy & Data Centers"
  | "Cloud Computing"
  | "Indigenous & Conservation"
  | "Environmental AI Governance";

export const TRACKS: TrackName[] = [
  "Energy & Data Centers",
  "Cloud Computing",
  "Indigenous & Conservation",
  "Environmental AI Governance",
];

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
  // Environmental AI Governance
  {
    url: "https://news.google.com/rss/search?q=%22AI+environmental%22+OR+%22sustainable+AI%22+standard+policy&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: Sustainable AI",
    track: "Environmental AI Governance",
  },
  {
    url: "https://news.google.com/rss/search?q=%22AI+carbon%22+OR+%22AI+energy+footprint%22+OR+%22AI+emissions%22+governance&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: AI Carbon",
    track: "Environmental AI Governance",
  },
  {
    url: "https://news.google.com/rss/search?q=ITU+AI+OR+%22UN+AI%22+OR+%22IEEE+AI%22+environmental+standard+2025+OR+2026&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: AI Standards Bodies",
    track: "Environmental AI Governance",
  },
  {
    url: "https://news.google.com/rss/search?q=%22AI+governance%22+environment+sustainability+regulation&hl=en-US&gl=US&ceid=US:en",
    source: "Google News: AI Governance",
    track: "Environmental AI Governance",
  },
];
