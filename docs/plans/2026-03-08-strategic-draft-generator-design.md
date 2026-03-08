# Strategic Draft Generator — Design

**Date:** 2026-03-08
**Status:** Approved

## Goal

Enable VP (and team) to generate blog drafts from topic briefs directly in the drafts dashboard, alongside the existing auto-generated RSS-based posts. First use case: generate 2 strategic posts targeting NVIDIA and a whitepaper-style acquisition hook.

## What We're Building

### 1. `POST /api/drafts/generate` Endpoint

Accepts a topic brief, calls Claude to generate a thought-leadership blog post, saves as a regular draft in Netlify Blobs.

**Request body:**
```json
{
  "topic": "Beyond the GPU: Why Digital Sanitation is Critical for the GB200 Era",
  "angle": "NVIDIA is shifting from chip supplier to full-stack infrastructure provider. OptiCloud ensures next-gen chips aren't wasting cycles on zombie data.",
  "keyArguments": "Explain how OptiCloud's software maximizes ROI of GB200 hardware by eliminating digital waste.",
  "track": "Energy & Data Centers"
}
```

**Response:** `{ "id": "draft-...", "title": "..." }` (201 Created)

**Validation:**
- `topic` required, max 200 chars
- `angle` required, max 500 chars
- `keyArguments` required, max 1000 chars
- `track` required, must be valid Track
- Requires `ANTHROPIC_API_KEY` env var

**Auth:** Same `DRAFT_AUTH_TOKEN` header as existing draft endpoints.

### 2. Strategic Blog Prompt

Different from the RSS blog-writer prompt. Characteristics:
- Thought-leadership style (not news-hook)
- 1200-1800 words (longer than RSS-based 600-900)
- Data-driven arguments positioning OptiCloud's "Digital Sanitation" value prop
- Professional but bold tone — targeting executive / M&A audience
- Same JSON output format: `{ title, slug, metaDescription, keywords, content }`

### 3. "New Draft" Button on `/drafts` Page

Client component with:
- Button that opens an inline form (not a modal — keeps it simple)
- Fields: Topic/Title (text), Angle (text), Key Arguments (textarea), Track (dropdown)
- "Generate" button → POST to `/api/drafts/generate`
- Loading state while Claude generates (~15-30s)
- On success: redirect to `/drafts/[id]` editor
- On error: inline error message

### 4. First 2 Drafts to Generate

After building the system, generate:

1. **NVIDIA**: "Beyond the GPU: Why Digital Sanitation is Critical for the GB200 Era"
   - Track: Energy & Data Centers
   - Angle: NVIDIA shifting to full-stack infra provider
   - Key args: OptiCloud prevents zombie data from wasting GB200 compute cycles

2. **Whitepaper**: "The $1 Trillion Digital Waste Problem"
   - Track: Cloud Computing
   - Angle: Whitepaper-style post quantifying hidden carbon cost of unused data
   - Key args: Fortune 500 savings funneled into ESG, appeals to Big Tech ESG targets

## What We're NOT Changing

- No new Track type — posts use existing tracks
- No changes to blog display, draft editor, or publish flow
- No changes to RSS-based blog-writer function
- No changes to daily-digest function

## Files to Create/Modify

- `app/api/drafts/generate/route.ts` — new endpoint
- `components/NewDraftForm.tsx` — new client component
- `app/drafts/page.tsx` — add NewDraftForm button
