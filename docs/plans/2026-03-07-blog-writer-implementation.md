# Blog Writer & Content Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automated SEO blog writing from HIGH-priority news articles, with draft management UI and a test blog — all on the existing Netlify app.

**Architecture:** Scheduled Netlify function fetches RSS feeds weekly, filters HIGH-priority articles, calls Claude API to generate blog drafts, stores in Netlify Blobs. Next.js pages at `/drafts` and `/blog` handle review and publishing. Reuses existing scoring rules, feed config, and dark-theme styling.

**Tech Stack:** Next.js 16 (App Router), Netlify Functions, Netlify Blobs, Claude API (`@anthropic-ai/sdk`), `react-markdown` + `remark-gfm`, Tailwind CSS, Brevo email API.

**Design doc:** `docs/plans/2026-03-07-blog-writer-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install runtime packages**

Run:
```bash
npm install @anthropic-ai/sdk @netlify/blobs react-markdown remark-gfm
```

Expected: 4 packages added to dependencies in `package.json`.

**Step 2: Verify installation**

Run:
```bash
node -e "require('@anthropic-ai/sdk'); require('@netlify/blobs'); require('react-markdown'); console.log('All packages OK')"
```

Expected: `All packages OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add blog writer dependencies (anthropic sdk, netlify blobs, react-markdown)"
```

---

## Task 2: Add BlogDraft Type

**Files:**
- Modify: `types/index.ts`

**Step 1: Add the BlogDraft interface**

Append to `types/index.ts` after the existing `FeedConfig` interface:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -5
```

Expected: No errors (or only pre-existing ones).

**Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add BlogDraft type definition"
```

---

## Task 3: Create Blob Storage Helper

**Files:**
- Create: `lib/blobs.ts`

This helper wraps `@netlify/blobs` with typed functions for BlogDraft CRUD. All Netlify Blobs operations go through this file.

**Step 1: Create `lib/blobs.ts`**

```typescript
import { getStore } from "@netlify/blobs";
import type { BlogDraft } from "@/types";

const STORE_NAME = "blog-drafts";

function getdraftsStore() {
  return getStore({ name: STORE_NAME, siteID: process.env.SITE_ID || "", token: process.env.NETLIFY_API_TOKEN || "" });
}

// For Netlify function context (has built-in auth)
function getdraftsStoreFromContext() {
  return getStore(STORE_NAME);
}

export async function listDrafts(status?: BlogDraft["status"]): Promise<BlogDraft[]> {
  const store = getdraftsStore();
  const { blobs } = await store.list();
  const drafts: BlogDraft[] = [];

  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: "json" }) as BlogDraft | null;
    if (data && (!status || data.status === status)) {
      drafts.push(data);
    }
  }

  // Sort newest first
  drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return drafts;
}

export async function getDraft(id: string): Promise<BlogDraft | null> {
  const store = getdraftsStore();
  return await store.get(id, { type: "json" }) as BlogDraft | null;
}

export async function getDraftBySlug(slug: string): Promise<BlogDraft | null> {
  const drafts = await listDrafts("published");
  return drafts.find((d) => d.slug === slug) || null;
}

export async function saveDraft(draft: BlogDraft): Promise<void> {
  const store = getdraftsStore();
  await store.setJSON(draft.id, draft);
}

export async function deleteDraft(id: string): Promise<void> {
  const store = getdraftsStore();
  await store.delete(id);
}

// Variant for Netlify scheduled functions (uses built-in context auth)
export async function saveDraftFromFunction(draft: BlogDraft): Promise<void> {
  const store = getDraftsStoreFromContext();
  await store.setJSON(draft.id, draft);
}

export async function listDraftsFromFunction(): Promise<BlogDraft[]> {
  const store = getDraftsStoreFromContext();
  const { blobs } = await store.list();
  const drafts: BlogDraft[] = [];

  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: "json" }) as BlogDraft | null;
    if (data) drafts.push(data);
  }

  drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return drafts;
}
```

**Important context for implementer:** Netlify Blobs auth differs between contexts:
- **Netlify Functions** (scheduled): Use `getStore("name")` — auth is automatic from the function environment.
- **Next.js API routes** (at build or runtime on Netlify): Use `getStore({ name, siteID, token })` — needs `SITE_ID` and `NETLIFY_API_TOKEN` env vars set in Netlify dashboard.

After implementing, add `SITE_ID` and `NETLIFY_API_TOKEN` to Netlify env vars (get from Netlify dashboard → Site configuration → General → Site ID, and User settings → Applications → Personal access tokens).

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -5
```

Note: `lib/blobs.ts` is inside the tsconfig include but `@netlify/blobs` may need type resolution. If there are errors, check that the import resolves. The `@netlify/blobs` package ships its own types.

**Step 3: Commit**

```bash
git add lib/blobs.ts
git commit -m "feat: add Netlify Blobs storage helper for blog drafts"
```

---

## Task 4: Build the Blog Writer Scheduled Function

**Files:**
- Create: `netlify/functions/blog-writer.mts`

This is the core function. Runs weekly, fetches feeds, picks HIGH articles, calls Claude API, saves drafts.

**Step 1: Create `netlify/functions/blog-writer.mts`**

The function follows the same pattern as `daily-digest.mts`:
- Uses `schedule()` from `@netlify/functions`
- Imports from `../../lib/feeds.js` and `../../lib/scoring-rules.js` (note: `.js` extension for Netlify function ESM resolution)
- Uses `rss-parser` directly (same as digest)

```typescript
import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { FEEDS } from "../../lib/feeds.js";
import { HIGH_KEYWORDS, LOW_KEYWORDS, isAuthoritativeSource } from "../../lib/scoring-rules.js";

const WRITER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SourceArticle {
  title: string;
  description: string;
  link: string;
  source: string;
  track: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  pubDate: string;
}

function scoreArticle(title: string, description: string, link: string, source: string): "HIGH" | "MEDIUM" | "LOW" {
  if (isAuthoritativeSource(link, source)) return "HIGH";
  const text = `${title} ${description}`.toLowerCase();
  if (HIGH_KEYWORDS.some((k) => text.includes(k))) return "HIGH";
  if (LOW_KEYWORDS.some((k) => text.includes(k))) return "LOW";
  return "MEDIUM";
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
}

const BLOG_PROMPT = `You are a blog writer for OptiCloud, a cloud optimization and sustainability platform founded in 2024. OptiCloud helps organizations reduce cloud costs and environmental impact.

Your writing style:
- Open with the news event as a hook (what happened, why it matters)
- Analyze implications for the cloud sustainability industry
- Pivot to OptiCloud's perspective and what this means for their clients
- Professional but accessible tone — think industry thought leadership
- Target 600-900 words
- Use H2 (##) and H3 (###) headings. Do NOT use H1 — the title is separate.
- Include 3-5 SEO keywords naturally woven into the text
- Cite source articles with inline links
- End with a forward-looking takeaway for readers

You MUST respond with ONLY valid JSON in this exact format (no markdown fences, no preamble):
{
  "title": "Compelling, SEO-friendly blog post title (under 60 chars)",
  "slug": "url-friendly-slug",
  "metaDescription": "SEO meta description under 160 characters summarizing the post",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "content": "## First Section Heading\\n\\nFull markdown body here..."
}`;

async function generateDraft(
  articles: SourceArticle[],
  anthropic: Anthropic
): Promise<{ title: string; slug: string; metaDescription: string; keywords: string[]; content: string } | null> {
  const articleContext = articles
    .map((a) => `- "${a.title}" (${a.source}, ${a.link})\n  ${a.description}`)
    .join("\n");

  const track = articles[0].track;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Write a blog post for the "${track}" topic based on these recent HIGH-priority articles:\n\n${articleContext}\n\nCombine insights from these articles into a single cohesive blog post. Link to the source articles within the text.`,
        },
      ],
      system: BLOG_PROMPT,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    if (!parsed.title || !parsed.content) {
      console.error("Claude response missing required fields");
      return null;
    }

    return {
      title: parsed.title,
      slug: parsed.slug || slugify(parsed.title),
      metaDescription: parsed.metaDescription || "",
      keywords: parsed.keywords || [],
      content: parsed.content,
    };
  } catch (err) {
    console.error("Claude API error:", err);
    return null;
  }
}

const handler = schedule("0 10 * * 1", async () => {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.GMAIL_USER;
  const toEmail = process.env.DIGEST_TO_EMAIL;

  if (!anthropicKey) {
    console.error("Missing ANTHROPIC_API_KEY");
    return { statusCode: 500 };
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const store = getStore("blog-drafts");
  const parser = new Parser({ timeout: 10000 });

  // 1. Fetch and score articles (same pattern as daily-digest)
  const articles: SourceArticle[] = [];
  const seenTitles = new Set<string>();
  const now = Date.now();

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const result = await parser.parseURL(feed.url);
        for (const item of (result.items || []).slice(0, 15)) {
          const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
          const age = now - new Date(pubDate).getTime();
          if (age > WRITER_MAX_AGE_MS) continue;

          const title = item.title || "";
          const titleKey = normalizeTitle(title);
          if (seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);

          const description = (item.contentSnippet || item.content || "")
            .replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
          const link = item.link || feed.url;
          const priority = scoreArticle(title, description, link, feed.source);

          if (priority === "HIGH") {
            articles.push({ title, description, link, source: feed.source, track: feed.track, priority, pubDate });
          }
        }
      } catch {
        // skip failed feeds
      }
    })
  );

  if (articles.length === 0) {
    console.log("No HIGH-priority articles found this week — no drafts generated");
    return { statusCode: 200 };
  }

  // 2. Group by track, pick top 2 per track
  const byTrack: Record<string, SourceArticle[]> = {};
  for (const a of articles) {
    if (!byTrack[a.track]) byTrack[a.track] = [];
    byTrack[a.track].push(a);
  }

  // 3. Check existing drafts to avoid duplicates
  const existingDrafts: string[] = [];
  try {
    const { blobs } = await store.list();
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: "json" }) as { title?: string } | null;
      if (data?.title) existingDrafts.push(normalizeTitle(data.title));
    }
  } catch {
    // first run — no existing drafts
  }

  // 4. Generate drafts
  let draftsCreated = 0;
  const errors: string[] = [];

  for (const [track, trackArticles] of Object.entries(byTrack)) {
    const top = trackArticles
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 2);

    // Skip if we already have a draft with a very similar title
    const candidateTopics = normalizeTitle(top.map((a) => a.title).join(" "));
    if (existingDrafts.some((existing) => {
      const overlap = existing.split(" ").filter((w) => candidateTopics.includes(w));
      return overlap.length > 5;
    })) {
      console.log(`Skipping ${track} — similar draft already exists`);
      continue;
    }

    const result = await generateDraft(top, anthropic);
    if (!result) {
      errors.push(track);
      continue;
    }

    const draftId = `draft-${now}-${result.slug}`;
    const draft = {
      id: draftId,
      status: "draft" as const,
      title: result.title,
      slug: result.slug,
      metaDescription: result.metaDescription,
      content: result.content,
      track,
      sourceArticles: top.map((a) => ({ title: a.title, link: a.link, source: a.source })),
      keywords: result.keywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };

    await store.setJSON(draftId, draft);
    draftsCreated++;
    console.log(`Draft created: "${result.title}" [${track}]`);
  }

  // 5. Send notification email
  if (brevoKey && fromEmail && toEmail && draftsCreated > 0) {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const errorNote = errors.length > 0
      ? `<p style="color:#f87171;font-size:13px;">⚠️ Failed to generate drafts for: ${errors.join(", ")}</p>`
      : "";

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Opticloud Intel", email: fromEmail },
        to: [{ email: toEmail }],
        subject: `Opticloud Blog: ${draftsCreated} New Draft${draftsCreated > 1 ? "s" : ""} Ready — ${today}`,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f1f5f9;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f97316;margin-bottom:8px;">OPTICLOUD BLOG</div>
            <h1 style="font-size:20px;margin:0 0 16px;">${draftsCreated} new draft${draftsCreated > 1 ? "s" : ""} ready for review</h1>
            <p style="color:#9ca3af;font-size:14px;">Head to the <a href="https://playful-douhua-3ed339.netlify.app/drafts" style="color:#f97316;">Drafts dashboard</a> to review, edit, and approve.</p>
            ${errorNote}
          </div>`,
      }),
    });
  }

  console.log(`Blog writer complete: ${draftsCreated} drafts created, ${errors.length} errors`);
  return { statusCode: 200 };
});

export { handler };
```

**Step 2: Add `ANTHROPIC_API_KEY` to `.env.local`**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

And add to Netlify env vars via the dashboard.

**Step 3: Verify the function file has no syntax errors**

Run:
```bash
npx tsc --noEmit --project netlify/functions/tsconfig.json 2>&1 | head -10
```

If errors, fix them. The netlify functions tsconfig uses `NodeNext` module resolution.

**Step 4: Commit**

```bash
git add netlify/functions/blog-writer.mts
git commit -m "feat: add blog-writer scheduled function with Claude API integration"
```

---

## Task 5: Build Drafts API Routes

**Files:**
- Create: `app/api/drafts/route.ts`
- Create: `app/api/drafts/[id]/route.ts`
- Create: `app/api/drafts/[id]/publish/route.ts`

These API routes wrap the blob storage helper for the frontend.

**Step 1: Create `app/api/drafts/route.ts` (list + create)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listDrafts, saveDraft } from "@/lib/blobs";
import type { BlogDraft } from "@/types";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as BlogDraft["status"] | null;
  try {
    const drafts = await listDrafts(status || undefined);
    return NextResponse.json(drafts);
  } catch (err) {
    console.error("Failed to list drafts:", err);
    return NextResponse.json({ error: "Failed to list drafts" }, { status: 500 });
  }
}
```

**Step 2: Create `app/api/drafts/[id]/route.ts` (get, update, delete)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft, deleteDraft } from "@/lib/blobs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const draft = await getDraft(id);
    if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(draft);
  } catch (err) {
    console.error("Failed to get draft:", err);
    return NextResponse.json({ error: "Failed to get draft" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existing = await getDraft(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates = await request.json();
    const updated = {
      ...existing,
      ...updates,
      id, // prevent ID change
      updatedAt: new Date().toISOString(),
    };
    await saveDraft(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update draft:", err);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteDraft(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Failed to delete draft:", err);
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
  }
}
```

**Step 3: Create `app/api/drafts/[id]/publish/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft } from "@/lib/blobs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const draft = await getDraft(id);
    if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (draft.status !== "approved") {
      return NextResponse.json({ error: "Draft must be approved before publishing" }, { status: 400 });
    }

    const published = {
      ...draft,
      status: "published" as const,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDraft(published);
    return NextResponse.json(published);
  } catch (err) {
    console.error("Failed to publish draft:", err);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
```

**Step 4: Verify routes compile**

Run:
```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -10
```

**Step 5: Commit**

```bash
git add app/api/drafts/
git commit -m "feat: add drafts API routes (list, get, update, delete, publish)"
```

---

## Task 6: Update Navigation

**Files:**
- Modify: `components/Header.tsx`

**Step 1: Add nav links to Header**

Add navigation links between the branding and the right-side controls. Use `next/link` and `usePathname` to highlight the active page. Add links for Intel (`/`), Drafts (`/drafts`), and Blog (`/blog`).

The Header currently receives `articleCount` and `lastUpdated` as props — these are intel-specific. Make them optional so the header works on all pages.

```typescript
// Updated interface:
interface HeaderProps {
  articleCount?: number;
  lastUpdated?: string;
}
```

Add navigation items between the logo div and the right-side controls:

```tsx
<nav className="hidden sm:flex items-center gap-1">
  {[
    { href: "/", label: "Intel" },
    { href: "/drafts", label: "Drafts" },
    { href: "/blog", label: "Blog" },
  ].map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
        pathname === link.href
          ? "bg-white/10 text-white"
          : "text-white/40 hover:text-white/70 hover:bg-white/5"
      }`}
    >
      {link.label}
    </Link>
  ))}
</nav>
```

Import `Link` from `next/link` and `usePathname` from `next/navigation`.

**Step 2: Verify it compiles**

Run:
```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: add Intel/Drafts/Blog navigation to header"
```

---

## Task 7: Build Drafts List Page

**Files:**
- Create: `app/drafts/page.tsx`
- Create: `components/DraftCard.tsx`

**Step 1: Create `components/DraftCard.tsx`**

A card component for the drafts list. Shows title, track badge, status badge, date, source count. Clicking navigates to the editor. Reuse the same color scheme from `ArticleCard.tsx`:

- Track colors: same `TRACK_COLORS` map
- Status badges: draft = gray, approved = amber, published = emerald

```typescript
"use client";

import Link from "next/link";
import type { BlogDraft } from "@/types";
import type { Track } from "@/types";

const TRACK_COLORS: Record<string, string> = {
  "Energy & Data Centers": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Cloud Computing": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Indigenous & Conservation": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "Environmental AI Governance": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const STATUS_STYLES = {
  draft: "bg-white/5 text-white/50 border-white/10",
  approved: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function DraftCard({ draft }: { draft: BlogDraft }) {
  const trackColor = TRACK_COLORS[draft.track] || "bg-white/5 text-white/40 border-white/10";
  const statusStyle = STATUS_STYLES[draft.status];
  const date = new Date(draft.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link
      href={`/drafts/${draft.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:bg-white/[0.06] hover:border-white/15"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${statusStyle}`}>
          {draft.status}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${trackColor}`}>
          {draft.track}
        </span>
        <span className="ml-auto text-[11px] text-white/30">{date}</span>
      </div>

      <h3 className="text-sm font-medium leading-snug text-white/90 group-hover:text-white line-clamp-2">
        {draft.title}
      </h3>

      {draft.metaDescription && (
        <p className="text-xs text-white/40 line-clamp-2">{draft.metaDescription}</p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-white/30">
        <span>{draft.sourceArticles.length} source{draft.sourceArticles.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{draft.keywords.length} keywords</span>
      </div>
    </Link>
  );
}
```

**Step 2: Create `app/drafts/page.tsx`**

Server component that fetches drafts and renders the list.

```typescript
import Header from "@/components/Header";
import DraftCard from "@/components/DraftCard";
import { listDrafts } from "@/lib/blobs";

export const revalidate = 0; // Always fresh

export default async function DraftsPage() {
  let drafts;
  try {
    drafts = await listDrafts();
  } catch {
    drafts = [];
  }

  const draftCount = drafts.filter((d) => d.status === "draft").length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const publishedCount = drafts.filter((d) => d.status === "published").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="fixed -top-64 -left-64 h-[500px] w-[500px] rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

      <Header />

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white/90 mb-2">Blog Drafts</h1>
          <div className="flex gap-4 text-xs text-white/40">
            <span>{draftCount} pending</span>
            <span>{approvedCount} approved</span>
            <span>{publishedCount} published</span>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-12 text-center">
            <p className="text-white/40 text-sm">No drafts yet. The blog writer runs every Monday at 10 AM UTC.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds, `/drafts` route appears in output.

**Step 4: Commit**

```bash
git add components/DraftCard.tsx app/drafts/page.tsx
git commit -m "feat: add drafts list page with DraftCard component"
```

---

## Task 8: Build Draft Editor Page

**Files:**
- Create: `app/drafts/[id]/page.tsx`
- Create: `components/DraftEditor.tsx`

**Step 1: Create `components/DraftEditor.tsx`**

Client component with:
- Editable title, meta description (with char counter), keywords, content textarea
- Live markdown preview using `react-markdown`
- Action buttons: Save, Approve, Publish, Delete
- Source articles list (read-only)

This is the largest UI component. Key behaviors:
- `Save` → PUT to `/api/drafts/[id]` with current field values
- `Approve` → PUT with `{ status: "approved" }`
- `Publish` → POST to `/api/drafts/[id]/publish`
- `Delete` → DELETE to `/api/drafts/[id]`, then redirect to `/drafts`

Use `react-markdown` with `remark-gfm` for the preview panel. Import as:
```typescript
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
```

Style the markdown preview with Tailwind `prose` classes or manual heading/paragraph styles matching the dark theme.

The editor layout: two-column on desktop (editor left, preview right), stacked on mobile.

**Step 2: Create `app/drafts/[id]/page.tsx`**

Server component that fetches the draft and passes it to the editor:

```typescript
import { getDraft } from "@/lib/blobs";
import Header from "@/components/Header";
import DraftEditor from "@/components/DraftEditor";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function DraftEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <Header />
      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <DraftEditor draft={draft} />
      </main>
    </div>
  );
}
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add components/DraftEditor.tsx app/drafts/\[id\]/page.tsx
git commit -m "feat: add draft editor page with markdown preview and action buttons"
```

---

## Task 9: Build Blog Index Page

**Files:**
- Create: `app/blog/page.tsx`
- Create: `components/BlogPostCard.tsx`

**Step 1: Create `components/BlogPostCard.tsx`**

Similar to DraftCard but for published posts. Shows title, meta description, track, publish date, estimated read time (content length / 200 wpm).

**Step 2: Create `app/blog/page.tsx`**

Server component that lists published drafts:

```typescript
import Header from "@/components/Header";
import BlogPostCard from "@/components/BlogPostCard";
import { listDrafts } from "@/lib/blobs";

export const revalidate = 60; // refresh every minute

export const metadata = {
  title: "Opticloud Blog — Cloud Sustainability Insights",
  description: "Expert analysis on cloud optimization, sustainability regulations, and environmental AI governance.",
};

export default async function BlogPage() {
  let posts;
  try {
    posts = await listDrafts("published");
  } catch {
    posts = [];
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Same background pattern */}
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <Header />

      <main className="relative mx-auto max-w-3xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white/90 mb-2">Opticloud Blog</h1>
          <p className="text-sm text-white/40">Cloud sustainability insights and analysis</p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-12 text-center">
            <p className="text-white/40 text-sm">No posts published yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add components/BlogPostCard.tsx app/blog/page.tsx
git commit -m "feat: add blog index page listing published posts"
```

---

## Task 10: Build Blog Post Page with SEO

**Files:**
- Create: `app/blog/[slug]/page.tsx`

This is the individual blog post page with full SEO markup.

**Step 1: Create `app/blog/[slug]/page.tsx`**

Server component that:
1. Fetches the published draft by slug
2. Generates Next.js `metadata` with title, description, Open Graph, JSON-LD
3. Renders the markdown content with `react-markdown`
4. Shows source articles at the bottom

```typescript
import { getDraftBySlug, listDrafts } from "@/lib/blobs";
import Header from "@/components/Header";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// For rendering markdown in the page — needs a client component wrapper
// Create a small BlogContent client component that uses react-markdown

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getDraftBySlug(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: `${post.title} | Opticloud Blog`,
    description: post.metaDescription,
    keywords: post.keywords.join(", "),
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt || undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getDraftBySlug(slug);
  if (!post) notFound();

  const readTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));
  const publishDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "OptiCloud" },
    publisher: {
      "@type": "Organization",
      name: "OptiCloud",
      url: "https://www.opticloud.com",
    },
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Post header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 text-xs text-white/40">
            <span>{publishDate}</span>
            <span>·</span>
            <span>{readTime} min read</span>
            <span>·</span>
            <span className="text-orange-400">{post.track}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white/95 leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {post.keywords.map((kw) => (
              <span key={kw} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Markdown content — rendered via client component BlogContent */}
        <BlogContent content={post.content} />

        {/* Source articles */}
        {post.sourceArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/8">
            <h2 className="text-xs font-semibold tracking-wider text-white/40 uppercase mb-4">Sources</h2>
            <ul className="space-y-2">
              {post.sourceArticles.map((src) => (
                <li key={src.link}>
                  <a
                    href={src.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-400 hover:text-orange-300 transition"
                  >
                    {src.title}
                  </a>
                  <span className="text-xs text-white/30 ml-2">— {src.source}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <a href="/blog" className="text-sm text-white/40 hover:text-white/70 transition">
            ← Back to blog
          </a>
        </div>
      </article>
    </div>
  );
}
```

**Step 2: Create `components/BlogContent.tsx`**

Small client component wrapper for react-markdown:

```typescript
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogContent({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
```

**Step 3: Add markdown styling to `globals.css`**

Append dark-theme prose styles:

```css
/* Blog post markdown styling */
.prose-custom h2 { font-size: 1.25rem; font-weight: 600; color: rgba(255,255,255,0.9); margin-top: 2rem; margin-bottom: 0.75rem; }
.prose-custom h3 { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-top: 1.5rem; margin-bottom: 0.5rem; }
.prose-custom p { font-size: 0.95rem; line-height: 1.75; color: rgba(255,255,255,0.6); margin-bottom: 1rem; }
.prose-custom a { color: #f97316; text-decoration: underline; text-underline-offset: 2px; }
.prose-custom a:hover { color: #fb923c; }
.prose-custom ul, .prose-custom ol { margin: 1rem 0; padding-left: 1.5rem; color: rgba(255,255,255,0.6); }
.prose-custom li { margin-bottom: 0.5rem; font-size: 0.95rem; line-height: 1.75; }
.prose-custom blockquote { border-left: 3px solid rgba(255,255,255,0.1); padding-left: 1rem; color: rgba(255,255,255,0.5); font-style: italic; margin: 1.5rem 0; }
.prose-custom strong { color: rgba(255,255,255,0.85); }
.prose-custom code { background: rgba(255,255,255,0.05); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
```

**Step 4: Verify build**

Run:
```bash
npm run build 2>&1 | tail -10
```

**Step 5: Commit**

```bash
git add app/blog/\[slug\]/page.tsx components/BlogContent.tsx app/globals.css
git commit -m "feat: add blog post page with SEO metadata, JSON-LD, and markdown rendering"
```

---

## Task 11: End-to-End Verification

**Step 1: Run the dev server**

```bash
npm run dev
```

Navigate to:
- `http://localhost:3000` — Intel dashboard (should still work, now with nav)
- `http://localhost:3000/drafts` — Drafts page (empty state)
- `http://localhost:3000/blog` — Blog page (empty state)

Verify the navigation links appear and work on all three pages.

**Step 2: Test the blog writer function locally**

Create a quick test script `scripts/test-blog-writer.mjs` that simulates the blog writer:
- Fetches feeds
- Scores articles
- Calls Claude API for 1 draft
- Saves to a local JSON file for inspection

This lets you verify the Claude prompt generates good output without needing Netlify Blobs.

**Step 3: Deploy and test**

```bash
git push
```

After Netlify builds:
1. Set `ANTHROPIC_API_KEY` in Netlify env vars
2. Set `SITE_ID` and `NETLIFY_API_TOKEN` in Netlify env vars (needed for Blobs access from API routes)
3. Trigger redeploy
4. Navigate to the deployed `/drafts` and `/blog` pages
5. Manually trigger the blog-writer function from Netlify dashboard → Functions → blog-writer → Run now
6. Verify drafts appear on the `/drafts` page
7. Edit a draft, approve it, publish it
8. Verify it appears on the `/blog` page with correct SEO

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete blog writer content pipeline MVP"
```

---

## Task Summary

| # | Task | Key Files |
|---|------|-----------|
| 1 | Install dependencies | `package.json` |
| 2 | Add BlogDraft type | `types/index.ts` |
| 3 | Create blob storage helper | `lib/blobs.ts` |
| 4 | Build blog-writer function | `netlify/functions/blog-writer.mts` |
| 5 | Build drafts API routes | `app/api/drafts/**` |
| 6 | Update navigation | `components/Header.tsx` |
| 7 | Build drafts list page | `app/drafts/page.tsx`, `components/DraftCard.tsx` |
| 8 | Build draft editor page | `app/drafts/[id]/page.tsx`, `components/DraftEditor.tsx` |
| 9 | Build blog index page | `app/blog/page.tsx`, `components/BlogPostCard.tsx` |
| 10 | Build blog post page + SEO | `app/blog/[slug]/page.tsx`, `components/BlogContent.tsx` |
| 11 | End-to-end verification | Deploy + test |

## Environment Variables Needed

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Netlify env vars + `.env.local` | Claude API for blog generation |
| `SITE_ID` | Netlify env vars | Netlify Blobs auth from API routes |
| `NETLIFY_API_TOKEN` | Netlify env vars | Netlify Blobs auth from API routes |
| `BREVO_API_KEY` | Already set | Email notifications |
| `GMAIL_USER` | Already set | Email sender |
| `DIGEST_TO_EMAIL` | Already set | Email recipient |
