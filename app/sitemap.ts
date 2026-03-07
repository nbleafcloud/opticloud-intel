import { listDrafts } from "@/lib/blobs";
import type { MetadataRoute } from "next";

const SITE_URL = "https://newsintel.netlify.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: { slug: string; updatedAt: string }[] = [];
  try {
    posts = await listDrafts("published");
  } catch {
    // If blobs unavailable, return static pages only
  }

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
