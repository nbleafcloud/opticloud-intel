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

// Shared track color styles for UI components
export const TRACK_BADGE_COLORS: Record<Track, string> = {
  "Energy & Data Centers": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Cloud Computing": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Indigenous & Conservation": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Environmental AI Governance": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export const TRACK_TEXT_COLORS: Record<Track, string> = {
  "Energy & Data Centers": "text-blue-400",
  "Cloud Computing": "text-purple-400",
  "Indigenous & Conservation": "text-teal-400",
  "Environmental AI Governance": "text-orange-400",
};

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
