# Web Research Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Anthropic's `web_search` tool to the draft generation endpoint so blog posts cite real sources and use data-driven SEO keywords.

**Architecture:** Single API call with web search enabled. Claude searches for real sources, then generates the blog post JSON with inline citations. Source URLs are extracted from response citations and stored in `sourceArticles[]`.

**Key API detail:** The `web_search_20250305` tool is a server-side tool. When enabled, Claude autonomously decides when to search. The response contains interleaved `text`, `server_tool_use`, and `web_search_tool_result` content blocks. Text blocks may have a `citations` array with `url`, `title`, and `cited_text` fields.

---

### Task 1: Update the Generate API Route

**Files:**
- Modify: `app/api/drafts/generate/route.ts`

**Changes:**

1. Add `web_search_20250305` tool to the `messages.create` call:
```typescript
tools: [
  {
    type: "web_search_20250305" as const,
    name: "web_search",
    max_uses: 5,
  },
],
```

2. Update `STRATEGIC_PROMPT` to instruct Claude to:
   - Search for 3-5 real, authoritative sources before writing
   - Search for current SEO keywords for the topic
   - Cite sources inline using markdown links `[text](url)`
   - Include found source URLs in a new `sourceArticles` field in the JSON output

3. Update the JSON schema in the prompt to include:
```json
"sourceArticles": [{"title": "...", "link": "...", "source": "..."}]
```

4. Update response parsing to handle web search content blocks:
   - Concatenate all `text` type blocks to get the full response text
   - Extract JSON from the concatenated text (find first `{` to last `}`)
   - Also collect unique URLs from `citations` arrays on text blocks as a fallback for `sourceArticles`

5. Populate `sourceArticles` from the parsed JSON (primary) or extracted citations (fallback)

6. Increase `max_tokens` from 8000 to 16000 to accommodate research reasoning + blog post

**Step 2: Verify TypeScript compiles**

Run: `cd opticloud-intel && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/api/drafts/generate/route.ts
git commit -m "feat: add web search to draft generation for real sources and SEO keywords"
```

---

### Task 2: Update the NewDraftForm Loading Text

**Files:**
- Modify: `components/NewDraftForm.tsx`

**Changes:**
- Update loading text from `"Generating (~30s)..."` to `"Researching & writing (~60s)..."`

**Step 2: Commit**

```bash
git add components/NewDraftForm.tsx
git commit -m "feat: update draft form loading text for web research timing"
```

---

### Task 3: Build Verification

**Step 1:** Run `npm run build` — expect success
**Step 2:** Push to trigger Netlify deploy

---

### Task 4: Re-generate NVIDIA Draft with Real Sources

Use the production endpoint to generate a new NVIDIA draft with the updated endpoint.

Verify the draft has:
- Real source URLs in `sourceArticles`
- Inline markdown links to real articles
- Data-driven SEO keywords

---

### Task 5: Re-generate Whitepaper Draft with Real Sources

Same as Task 4 but for the whitepaper topic.
