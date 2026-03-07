# Blog Writer & Content Pipeline — Design Document

**Date:** 2026-03-07
**Status:** Draft — pending user review
**Phase:** Phase 2 of the Opticloud Content Machine

## Overview

Extend the existing Opticloud Intel dashboard with an automated blog writing pipeline: a scheduled function generates SEO-optimized blog post drafts from HIGH-priority news articles using the Claude API, stores them in Netlify Blobs, and surfaces them in a draft management UI for human review. Approved drafts publish to a test blog on the same app.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Writing style | Mix — news hook into Opticloud perspective |
| Review workflow | Dashboard UI at `/drafts` |
| Test blog location | Same app, new `/blog` route |
| Storage | Netlify Blobs (Approach A) |
| Generation trigger | Scheduled weekly function |

---

## 1. Data Model

Every blog draft is a JSON object stored in Netlify Blobs under a `blog-drafts` store.

```typescript
interface BlogDraft {
  id: string;                    // "draft-1741350000-eu-ai-act-enforcement"
  status: "draft" | "approved" | "published";
  title: string;                 // "EU AI Act Enforcement Begins..."
  slug: string;                  // "eu-ai-act-enforcement"
  metaDescription: string;       // SEO meta (<=160 chars)
  content: string;               // Full post body in Markdown
  track: string;                 // "Environmental AI Governance"
  sourceArticles: Array<{
    title: string;
    link: string;
    source: string;
  }>;
  keywords: string[];            // SEO target keywords
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  publishedAt: string | null;    // Set when status -> published
}
```

**Key format:** `draft-{timestamp}-{slug}` — allows listing all drafts and sorting by creation date.

Markdown for content keeps the MVP simple: editable in a textarea, renders to HTML for the blog. No rich-text editor needed.

---

## 2. Blog Writer Function

**File:** `netlify/functions/blog-writer.mts`
**Schedule:** `0 10 * * 1` (Every Monday at 10 AM UTC, 1 hour after the daily digest)

### Flow

1. Fetch all RSS feeds (reuse `FEEDS` config + `rss-parser`)
2. Score articles (reuse `scoring-rules.ts`)
3. Filter to HIGH-priority only, last 7 days
4. Deduplicate by normalized title
5. Group by track, pick top 2 articles per track (max 8 total)
6. For each selected article cluster, call Claude API with an SEO-optimized writing prompt
7. Parse Claude's response into structured fields (title, meta description, keywords, body)
8. Save each draft to Netlify Blobs with status "draft"
9. Send notification email via Brevo: "X new drafts ready for review"

### Claude API Prompt Strategy

The prompt instructs Claude to:
- Open with the news event (hook)
- Analyze implications for the cloud sustainability industry
- Pivot to Opticloud's perspective and what this means for their clients
- Use proper heading hierarchy (H2/H3, no H1 — that's the title)
- Target 600-900 words
- Include 3-5 SEO keywords naturally
- Generate a meta description (<=160 chars)
- Cite source articles with links
- Professional but accessible tone

The prompt includes context about Opticloud (cloud optimization, sustainability, founded 2024) so Claude writes from the right perspective.

### Response Format

Claude returns structured JSON:
```json
{
  "title": "...",
  "slug": "...",
  "metaDescription": "...",
  "keywords": ["...", "..."],
  "content": "## Introduction\n\n..."
}
```

### Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key (new)
- Reuses existing: `BREVO_API_KEY`, `GMAIL_USER`, `DIGEST_TO_EMAIL`

---

## 3. Draft Management UI

**Route:** `/drafts`

### Page Layout

Consistent with the existing intel dashboard — dark theme, same header, sidebar navigation added.

**Draft List View:**
- Cards showing: title, track badge, status badge, creation date, source count
- Filter by status: All / Draft / Approved / Published
- Click card to open editor

**Draft Editor View:**
- Title field (editable)
- Meta description field (editable, char counter)
- Keywords display (editable)
- Markdown content in a textarea (editable)
- Live preview panel (rendered Markdown -> HTML)
- Source articles listed (read-only, links to originals)
- Action buttons: Save / Approve / Publish / Delete

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/drafts` | GET | List all drafts (optional status filter) |
| `/api/drafts` | POST | Create draft manually (future) |
| `/api/drafts/[id]` | GET | Get single draft |
| `/api/drafts/[id]` | PUT | Update draft (edit content, change status) |
| `/api/drafts/[id]` | DELETE | Delete draft |
| `/api/drafts/[id]/publish` | POST | Move to published, set publishedAt |

All routes read/write Netlify Blobs via `@netlify/blobs`.

### No Authentication for MVP

The intel dashboard is already unprotected (internal tool). Draft management follows the same pattern. Authentication can be added later if needed.

---

## 4. Test Blog

**Route:** `/blog`

### Pages

- `/blog` — Blog index listing all published posts, newest first
- `/blog/[slug]` — Individual post page

### SEO Features

Each published post includes:
- `<title>` and `<meta name="description">` from draft fields
- Open Graph tags (og:title, og:description, og:type=article)
- JSON-LD Article schema markup
- JSON-LD BreadcrumbList
- Canonical URL
- Keywords meta tag
- Proper heading hierarchy
- Source citations as links (good for E-E-A-T)

### Blog Index

- Published posts in reverse chronological order
- Each card: title, meta description preview, track badge, publish date, read time
- Links to individual post pages

### Individual Post Page

- Title (H1)
- Publish date + track badge + read time
- Rendered Markdown content
- Source articles section at bottom
- "Back to blog" link
- SEO meta tags in `<head>`

### Styling

Dark theme matching the intel dashboard. Clean, readable typography optimized for long-form content. Max-width ~720px for the content column.

---

## 5. Navigation

Add a simple top-level nav to the existing Header component:

- **Intel** → `/` (existing dashboard)
- **Drafts** → `/drafts` (draft management)
- **Blog** → `/blog` (published posts)

---

## 6. Data Flow Diagram

```
Weekly (Monday 10 AM UTC)
         |
         v
  [blog-writer.mts]
    |        |
    |  Fetch RSS feeds
    |  Score + filter HIGH
    |  Pick top 2 per track
    |        |
    |  Call Claude API
    |  (for each article cluster)
    |        |
    |  Save drafts to Netlify Blobs
    |        |
    |  Send "drafts ready" email via Brevo
    |
    v
  [/drafts page]
    |
    |  Human reviews, edits, approves
    |
    v
  [Click "Publish"]
    |
    |  API route updates status -> "published"
    |  Sets publishedAt timestamp
    |
    v
  [/blog page]
    |
    |  Renders published posts with full SEO
```

---

## 7. New Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API calls for blog generation |
| `@netlify/blobs` | Draft storage (key-value store) |
| `react-markdown` + `remark-gfm` | Render Markdown to HTML in preview + blog |

No database. No authentication library. No rich-text editor. Minimal additions.

---

## 8. Error Handling

- **Feed fetch failures:** Same as digest — `Promise.allSettled()`, skip failed feeds
- **Claude API failure:** Log error, skip that draft, continue with others. Notification email reports partial failures.
- **Blob write failure:** Retry once, then log and skip
- **No HIGH articles this week:** Send "no drafts generated" notification, don't create empty drafts
- **Duplicate detection:** Before generating, check existing drafts for similar titles (normalized comparison) to avoid regenerating the same topic

---

## 9. Future Enhancements (NOT in MVP)

- Authentication / role-based access
- Rich-text editor (replace textarea)
- Auto-scheduling publish dates
- Social media sharing on publish
- Analytics / read counts
- Migration to opticloud.com production site
- Multiple drafts per article (A/B headline testing)
- Competitor content gap analysis feeding into topic selection
