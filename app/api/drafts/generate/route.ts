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

## Research Phase
Before writing, you MUST use your web search tool to:
1. Search for 3-5 recent, authoritative sources related to the topic (industry reports, news articles, company announcements)
2. Search for current SEO keywords and trends related to the topic
3. Find specific statistics, data points, and real company initiatives to reference

## Writing Style
- Executive thought leadership targeting CTO/VP-level readers and M&A teams
- Open with a bold, data-driven hook (a real stat from your research, a market shift, or a provocative question)
- Build a clear argument connecting the topic to OptiCloud's Digital Sanitation platform
- Include specific technical details that demonstrate deep domain expertise
- Reference REAL industry trends, standards, and company initiatives found during research
- Cite sources inline using markdown links: [description](url)
- Professional but confident tone — think McKinsey meets Wired
- Target 1200-1800 words
- Use H2 (##) and H3 (###) headings. Do NOT use H1 — the title is separate.
- Include 5-8 SEO keywords naturally woven into the text (informed by your research)
- End with a strong forward-looking conclusion that positions OptiCloud as essential infrastructure

## Output Format
After completing your research, respond with ONLY valid JSON in this exact format (no markdown fences, no preamble):
{
  "title": "Compelling, SEO-friendly title (under 70 chars)",
  "slug": "url-friendly-slug",
  "metaDescription": "SEO meta description under 160 characters summarizing the post",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sourceArticles": [{"title": "Article Title", "link": "https://...", "source": "Publisher Name"}],
  "content": "## First Section Heading\\n\\nFull markdown body here with [inline citations](https://real-url)..."
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
      max_tokens: 16000,
      tools: [
        {
          type: "web_search_20250305" as const,
          name: "web_search" as const,
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Write a strategic thought-leadership blog post for OptiCloud.

Topic: ${topic}
Angle: ${angle}
Key Arguments: ${keyArguments}
Industry Track: ${track}

First, research the topic using web search to find real sources, statistics, and SEO keywords. Then write a compelling, data-driven post that positions OptiCloud's Digital Sanitation platform as critical infrastructure for this space. Cite real sources with inline links.`,
        },
      ],
      system: STRATEGIC_PROMPT,
    });

    // Extract text from response (may contain interleaved search/text blocks)
    let text = "";
    const citationUrls = new Map<string, { title: string; source: string }>();

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
        // Collect citation URLs from web search results
        if (block.citations) {
          for (const citation of block.citations) {
            if (citation.type === "web_search_result_location" && citation.url) {
              citationUrls.set(citation.url, {
                title: citation.title || "",
                source: new URL(citation.url).hostname.replace(/^www\./, ""),
              });
            }
          }
        }
      }
    }

    // Extract JSON from the response text (may have reasoning text before JSON)
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json(
        { error: "AI response did not contain valid JSON" },
        { status: 502 }
      );
    }
    text = text.slice(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(text);

    if (!parsed.title || !parsed.content) {
      return NextResponse.json(
        { error: "AI response missing required fields" },
        { status: 502 }
      );
    }

    // Validate AI-generated fields (same limits as PUT /api/drafts/[id])
    const title = String(parsed.title).slice(0, 200);
    const content = String(parsed.content).slice(0, 50000);
    const metaDescription = String(parsed.metaDescription || "").slice(0, 300);
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === "string").slice(0, 20) as string[]
      : [];

    // Always slugify to ensure valid ID characters
    const slug = slugify(parsed.slug || parsed.title);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const draftId = `draft-${now}-${slug}`;

    // Build sourceArticles from AI output, falling back to extracted citations
    type SourceArticle = BlogDraft["sourceArticles"][number];
    let sourceArticles: SourceArticle[] = [];
    if (Array.isArray(parsed.sourceArticles) && parsed.sourceArticles.length > 0) {
      sourceArticles = parsed.sourceArticles
        .filter((s: unknown): s is Record<string, string> =>
          typeof s === "object" && s !== null && typeof (s as Record<string, string>).link === "string"
        )
        .map((s: Record<string, string>) => ({
          title: String(s.title || "").slice(0, 200),
          link: String(s.link).slice(0, 500),
          source: String(s.source || "").slice(0, 100),
        }))
        .slice(0, 20);
    }
    // Merge in any citation URLs not already present
    for (const [url, meta] of citationUrls) {
      if (!sourceArticles.some((s) => s.link === url)) {
        sourceArticles.push({ title: meta.title.slice(0, 200), link: url, source: meta.source });
      }
    }

    const draft: BlogDraft = {
      id: draftId,
      status: "draft",
      title,
      slug,
      metaDescription,
      content,
      track: track as Track,
      sourceArticles,
      keywords,
      createdAt: nowIso,
      updatedAt: nowIso,
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
