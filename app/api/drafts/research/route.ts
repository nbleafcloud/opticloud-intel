import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";

const RESEARCH_PROMPT = `You are a research analyst. Search the web to find real, authoritative sources on the given topic. Focus on:
1. Recent news articles, industry reports, and company announcements
2. Specific statistics and data points with attribution
3. Current SEO keywords people search for related to this topic

After searching, respond with ONLY valid JSON (no markdown fences, no preamble):
{
  "sources": [
    {"title": "Article Title", "url": "https://...", "publisher": "Publisher Name", "keyFinding": "One-sentence key finding or stat"}
  ],
  "keywords": ["seo keyword 1", "seo keyword 2", "seo keyword 3"],
  "stats": ["Specific stat with attribution", "Another stat"]
}

Return 3-5 sources, 5-8 keywords, and 3-5 stats. Be concise.`;

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

  let body: { topic?: string; angle?: string; track?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, angle, track } = body;

  if (!topic || typeof topic !== "string" || topic.length > 200) {
    return NextResponse.json({ error: "topic is required (max 200 chars)" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      tools: [
        {
          type: "web_search_20250305" as const,
          name: "web_search" as const,
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Research this topic for a blog post:\n\nTopic: ${topic}${angle ? `\nAngle: ${angle}` : ""}${track ? `\nIndustry: ${track}` : ""}\n\nFind real sources, current data, and SEO keywords.`,
        },
      ],
      system: RESEARCH_PROMPT,
    });

    // Extract text and citations from response
    let text = "";
    const citationUrls: Array<{ title: string; url: string; publisher: string }> = [];

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
        if (block.citations) {
          for (const citation of block.citations) {
            if (citation.type === "web_search_result_location" && citation.url) {
              citationUrls.push({
                title: citation.title || "",
                url: citation.url,
                publisher: new URL(citation.url).hostname.replace(/^www\./, ""),
              });
            }
          }
        }
      }
    }

    // Extract JSON from response
    text = text.trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      // Merge citation URLs into sources if not already present
      const sourceUrls = new Set(
        (parsed.sources || []).map((s: { url?: string }) => s.url)
      );
      for (const c of citationUrls) {
        if (!sourceUrls.has(c.url)) {
          (parsed.sources || []).push({
            title: c.title,
            url: c.url,
            publisher: c.publisher,
            keyFinding: "",
          });
        }
      }
      return NextResponse.json(parsed);
    }

    // Fallback: return citations even if JSON parsing failed
    return NextResponse.json({
      sources: citationUrls.map((c) => ({
        title: c.title,
        url: c.url,
        publisher: c.publisher,
        keyFinding: "",
      })),
      keywords: [],
      stats: [],
    });
  } catch (err) {
    console.error("Research failed:", err);
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
