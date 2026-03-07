import { getStore } from "@netlify/blobs";
import type { BlogDraft } from "@/types";

const STORE_NAME = "blog-drafts";

function getDraftsStore() {
  // For Next.js API routes on Netlify: needs SITE_ID + NETLIFY_API_TOKEN env vars
  return getStore({
    name: STORE_NAME,
    siteID: process.env.SITE_ID || "",
    token: process.env.NETLIFY_API_TOKEN || "",
  });
}

export async function listDrafts(status?: BlogDraft["status"]): Promise<BlogDraft[]> {
  const store = getDraftsStore();
  const { blobs } = await store.list();
  const drafts: BlogDraft[] = [];

  for (const blob of blobs) {
    const data = (await store.get(blob.key, { type: "json" })) as BlogDraft | null;
    if (data && (!status || data.status === status)) {
      drafts.push(data);
    }
  }

  drafts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return drafts;
}

export async function getDraft(id: string): Promise<BlogDraft | null> {
  const store = getDraftsStore();
  return (await store.get(id, { type: "json" })) as BlogDraft | null;
}

export async function getDraftBySlug(slug: string): Promise<BlogDraft | null> {
  const drafts = await listDrafts("published");
  return drafts.find((d) => d.slug === slug) || null;
}

export async function saveDraft(draft: BlogDraft): Promise<void> {
  const store = getDraftsStore();
  await store.setJSON(draft.id, draft);
}

export async function deleteDraft(id: string): Promise<void> {
  const store = getDraftsStore();
  await store.delete(id);
}
