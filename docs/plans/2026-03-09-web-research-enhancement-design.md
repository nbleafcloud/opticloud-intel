# Web Research Enhancement for Draft Generator

**Date:** 2026-03-09
**Status:** Approved
**Goal:** Add a web research step to `POST /api/drafts/generate` so strategic blog posts cite real sources and use data-driven SEO keywords.

## Problem

The current draft generator calls Claude once with a system prompt. Claude generates plausible-sounding content from training data, but:
- Statistics and company initiatives may be fabricated
- No real source URLs are cited
- SEO keywords are guessed rather than informed by actual search trends
- `sourceArticles[]` is always empty

## Solution: Two-Phase Generation

### Phase 1 — Research (web search)

Call Claude with the `web_search` tool enabled. Prompt it to:
1. Search for 3-5 recent, authoritative sources on the topic
2. Search for current SEO keywords related to the topic
3. Return structured research findings (URLs, key stats, keyword suggestions)

### Phase 2 — Generation (existing flow + research context)

Feed the research results into the existing generation prompt as additional context. The generation prompt is updated to:
- Cite real URLs inline using markdown links
- Use statistics found during research
- Incorporate researched SEO keywords
- Return `sourceArticles` array with URLs found during research

## API Changes

### `POST /api/drafts/generate`

**No changes to request body.** Same fields: `topic`, `angle`, `keyArguments`, `track`.

**Response changes:** None (still returns `{ id, title }`).

**Internal changes:**
1. New research call before the generation call
2. Updated system prompt referencing research context
3. `sourceArticles` populated from research results
4. Updated JSON schema adds `sourceArticles` to AI output

### Research Call Details

```
model: claude-haiku-4-5-20251001
tools: [{ type: "web_search_20250305", name: "web_search" }]
max_tokens: 4000
```

Prompt asks Claude to research the topic and return JSON with:
- `sources`: array of `{ title, url, keyFinding }` (3-5 items)
- `keywords`: array of SEO-relevant keywords found (5-10)
- `stats`: array of specific data points with attribution

### Generation Call Updates

- System prompt updated to include a `## Research Context` section with real sources
- JSON schema updated: `sourceArticles` field added to expected output
- Prompt instructs Claude to cite sources using `[text](url)` markdown links

## UI Changes

### `NewDraftForm.tsx`

- Update loading text from "Generating (~30s)..." to "Researching & generating (~60s)..."

### Draft Editor (existing)

`sourceArticles` already renders if populated — no changes needed.

## Performance

- Adds ~15-20s for the research call (web search + processing)
- Total generation time: ~45-60s (was ~30s)
- Still within Netlify's function timeout if using streaming or background functions
- Consider: if timeout is still an issue, we could use Netlify Background Functions

## Cost

- Web search: ~$0.01 per generation (1-3 searches at $10/1000)
- Additional tokens for research call: ~$0.005
- Total per generation: ~$0.015 additional (negligible)

## No Changes To

- `BlogDraft` type (already has `sourceArticles` field)
- Existing draft editing/publishing flow
- RSS pipeline or scoring
- Authentication or validation logic
