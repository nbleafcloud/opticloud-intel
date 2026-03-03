export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type Track =
  | "Energy & Data Centers"
  | "Cloud Computing"
  | "Indigenous & Conservation"
  | "Sustainable AI Policy";

export interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  track: Track;
  priority: Priority;
}

export interface FeedConfig {
  url: string;
  source: string;
  track: Track;
}
