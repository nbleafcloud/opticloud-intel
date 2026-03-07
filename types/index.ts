export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type Track =
  | "Energy & Data Centers"
  | "Cloud Computing"
  | "Indigenous & Conservation"
  | "Environmental AI Governance";

export interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  track: Track;
  priority: Priority;
  isNew?: boolean;
}

export interface FeedConfig {
  url: string;
  source: string;
  track: Track;
}

export interface BlogDraft {
  id: string;
  status: "draft" | "approved" | "published";
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  track: Track;
  sourceArticles: Array<{
    title: string;
    link: string;
    source: string;
  }>;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
