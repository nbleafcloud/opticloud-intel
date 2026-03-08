# Strategic Draft Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "New Draft" button on the drafts dashboard that lets users generate blog drafts from topic briefs via Claude, then generate the first 2 strategic posts (NVIDIA + Whitepaper).

**Architecture:** New `POST /api/drafts/generate` Next.js API route accepts a topic brief, calls the Anthropic SDK with a thought-leadership prompt, saves the result as a BlogDraft in Netlify Blobs. A new `NewDraftForm` client component on `/drafts` provides the UI. No changes to existing types, RSS pipeline, or blog display.

**Tech Stack:** Next.js 16 API routes, `@anthropic-ai/sdk` (already installed), Netlify Blobs, React client component with `useState`.

---

### Task 1: Create the Generate API Route

**Files:**
- Create: `app/api/drafts/generate/route.ts`

**Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { saveDraft } from "@/lib/blobs";
import { requireAuth } from "@/lib/auth";
import { TRACKS } from "@/lib/feeds";
import type { BlogDraft, Track } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
}

const STRATEGIC_PROMPT = `You are a senior content strategist and ghostwriter for OptiCloud, a cloud optimization and sustainability platform. OptiCloud's core value proposition is "Digital Sanitation" — eliminating zombie data, idle resources, and digital waste to reduce cloud costs and environmental impact.

Your writing style:
- Executive thought leadership targeting CTO/VP-level readers and M&A teams
- Open with a bold, data-driven hook (a stat, a market shift, or a provocative question)
- Build a clear argument connecting the topic to OptiCloud's Digital Sanitation platform
- Include specific technical details that demonstrate deep domain expertise
- Reference real industry trends, standards, and company initiatives
- Professional but confident tone — think McKinsey meets Wired
- Target 1200-1800 words
- Use H2 (##) and H3 (###) headings. Do NOT use H1 — the title is separate.
- Include 5-8 SEO keywords naturally woven into the text
- End with a strong forward-looking conclusion that positions OptiCloud as essential infrastructure

You MUST respond with ONLY valid JSON in this exact format (no markdown fences, no preamble):
{
  "title": "Compelling, SEO-friendly title (under 70 chars)",
  "slug": "url-friendly-slug",
  "metaDescription": "SEO meta description under 160 characters summarizing the post",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "content": "## First Section Heading\\n\\nFull markdown body here..."
}`;

export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: { topic?: string; angle?: string; keyArguments?: string; track?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, angle, keyArguments, track } = body;

  // Validate required fields
  if (!topic || typeof topic !== "string" || topic.length > 200) {
    return NextResponse.json({ error: "topic is required (max 200 chars)" }, { status: 400 });
  }
  if (!angle || typeof angle !== "string" || angle.length > 500) {
    return NextResponse.json({ error: "angle is required (max 500 chars)" }, { status: 400 });
  }
  if (!keyArguments || typeof keyArguments !== "string" || keyArguments.length > 1000) {
    return NextResponse.json({ error: "keyArguments is required (max 1000 chars)" }, { status: 400 });
  }
  if (!track || !TRACKS.includes(track as Track)) {
    return NextResponse.json(
      { error: `track must be one of: ${TRACKS.join(", ")}` },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `Write a strategic thought-leadership blog post for OptiCloud.

Topic: ${topic}
Angle: ${angle}
Key Arguments: ${keyArguments}
Industry Track: ${track}

Write a compelling, data-driven post that positions OptiCloud's Digital Sanitation platform as critical infrastructure for this space.`,
        },
      ],
      system: STRATEGIC_PROMPT,
    });

    let text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if Claude wrapped the JSON
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(text);

    if (!parsed.title || !parsed.content) {
      return NextResponse.json(
        { error: "AI response missing required fields" },
        { status: 502 }
      );
    }

    const now = Date.now();
    const draftId = `draft-${now}-${parsed.slug || slugify(parsed.title)}`;

    const draft: BlogDraft = {
      id: draftId,
      status: "draft",
      title: parsed.title,
      slug: parsed.slug || slugify(parsed.title),
      metaDescription: parsed.metaDescription || "",
      content: parsed.content,
      track: track as Track,
      sourceArticles: [],
      keywords: parsed.keywords || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };

    await saveDraft(draft);

    return NextResponse.json({ id: draft.id, title: draft.title }, { status: 201 });
  } catch (err) {
    console.error("Draft generation failed:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd opticloud-intel && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/api/drafts/generate/route.ts
git commit -m "feat: add POST /api/drafts/generate endpoint for topic-brief drafts"
```

---

### Task 2: Create the NewDraftForm Component

**Files:**
- Create: `components/NewDraftForm.tsx`

**Step 1: Create the client component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKS } from "@/lib/feeds";

export default function NewDraftForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [keyArguments, setKeyArguments] = useState("");
  const [track, setTrack] = useState(TRACKS[0]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, angle, keyArguments, track }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const { id } = await res.json();
      router.push(`/drafts/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/20"
      >
        + New Draft
      </button>
    );
  }

  return (
    <form
      onSubmit={handleGenerate}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">
          Generate New Draft
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-white/30 hover:text-white/60 transition"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Topic / Title
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={200}
          required
          placeholder="Beyond the GPU: Why Digital Sanitation is Critical for the GB200 Era"
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition placeholder:text-white/20"
        />
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Angle
        </label>
        <input
          type="text"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          maxLength={500}
          required
          placeholder="NVIDIA is shifting from chip supplier to full-stack infrastructure provider..."
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition placeholder:text-white/20"
        />
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Key Arguments
        </label>
        <textarea
          value={keyArguments}
          onChange={(e) => setKeyArguments(e.target.value)}
          maxLength={1000}
          required
          rows={3}
          placeholder="Explain how OptiCloud's software ensures next-gen chips aren't wasting cycles on zombie data..."
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition resize-y placeholder:text-white/20"
        />
      </div>

      <div>
        <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
          Track
        </label>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-white/20 transition"
        >
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={generating}
        className="w-full rounded-lg border border-orange-500/30 bg-orange-500/15 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? "Generating (~30s)..." : "Generate Draft"}
      </button>
    </form>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd opticloud-intel && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/NewDraftForm.tsx
git commit -m "feat: add NewDraftForm component for generating drafts from topic briefs"
```

---

### Task 3: Add NewDraftForm to the Drafts Page

**Files:**
- Modify: `app/drafts/page.tsx`

**Step 1: Update the drafts page**

Add the import at the top:
```typescript
import NewDraftForm from "@/components/NewDraftForm";
```

Add the `<NewDraftForm />` component between the stats and the drafts grid. Insert it right after the closing `</div>` of the stats section (the `<div className="mb-8">` block), before the conditional empty/grid render:

```tsx
        {/* after the mb-8 stats div, before the drafts.length === 0 conditional */}
        <div className="mb-6">
          <NewDraftForm />
        </div>
```

**Step 2: Verify TypeScript compiles and build succeeds**

Run: `cd opticloud-intel && npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/drafts/page.tsx
git commit -m "feat: add New Draft button to drafts dashboard"
```

---

### Task 4: Manual Verification

**Step 1: Start the dev server and verify the form renders**

Run: `cd opticloud-intel && npm run dev`

Navigate to `http://localhost:3000/drafts`. Verify:
- "New Draft" button appears above the drafts grid
- Clicking it expands the inline form with Topic, Angle, Key Arguments, and Track fields
- Cancel button collapses the form
- Track dropdown shows all 4 tracks

**Step 2: Commit (if any fixes needed)**

---

### Task 5: Generate the NVIDIA Draft

**Step 1: Use the drafts dashboard to generate the NVIDIA post**

Fill in the form at `/drafts`:
- **Topic:** `Beyond the GPU: Why Digital Sanitation is Critical for the GB200 Era`
- **Angle:** `NVIDIA is shifting from being a chip supplier to a full-stack infrastructure provider. OptiCloud ensures their next-gen GB200 chips aren't wasting cycles on zombie data, maximizing actual ROI of their hardware investment.`
- **Key Arguments:** `Show how digital waste (zombie VMs, orphaned storage, idle containers) consumes up to 30% of compute cycles. Explain how OptiCloud's Digital Sanitation platform detects and eliminates this waste at the infrastructure layer, making every GB200 GPU cycle count. Position this as the missing software layer in NVIDIA's full-stack vision.`
- **Track:** `Energy & Data Centers`

Click "Generate Draft". Wait ~30s for Claude to generate the post. Verify you're redirected to the draft editor with a complete post.

**Step 2: Review the generated draft in the editor**

Verify the draft has:
- A compelling title
- 1200-1800 words of thought-leadership content
- H2/H3 headings
- SEO keywords
- Meta description
- No source articles (empty array, as expected for strategic posts)

---

### Task 6: Generate the Whitepaper Draft

**Step 1: Use the drafts dashboard to generate the Whitepaper post**

Fill in the form at `/drafts`:
- **Topic:** `The $1 Trillion Digital Waste Problem`
- **Angle:** `A whitepaper-style post quantifying the hidden carbon cost of unused data in cloud infrastructure. The global cloud industry wastes an estimated $1 trillion in compute, storage, and cooling on data and workloads that serve no business purpose.`
- **Key Arguments:** `Quantify digital waste across the cloud industry: idle VMs, orphaned storage volumes, redundant data copies, zombie containers. Connect this waste directly to carbon emissions and cooling costs. Present OptiCloud's Digital Sanitation framework as a measurable solution. Include a case study narrative showing how a Fortune 500 client saved $1M/year, which was then funneled into ESG initiatives like Amazon reforestation — a narrative that appeals to Big Tech's ESG targets.`
- **Track:** `Cloud Computing`

Click "Generate Draft". Wait ~30s. Verify redirect to editor.

**Step 2: Review the generated draft**

Same verification as Task 5. Ensure this has a whitepaper tone (data-heavy, longer-form).

---

### Task 7: Final Build Verification and Push

**Step 1: Run full build**

Run: `cd opticloud-intel && npm run build`
Expected: Build succeeds

**Step 2: Run Netlify functions TypeScript check**

Run: `cd opticloud-intel && npx tsc --noEmit --project netlify/functions/tsconfig.json`
Expected: No errors (the generate route is a Next.js API route, not a Netlify function, so this should be unaffected)

**Step 3: Push to trigger Netlify deploy**

```bash
git push
```

**Step 4: Verify on production**

Navigate to `https://newsintel.netlify.app/drafts`. Confirm:
- "New Draft" button visible
- Both generated drafts (NVIDIA + Whitepaper) appear as draft cards
- Clicking into each shows the full editor with generated content
