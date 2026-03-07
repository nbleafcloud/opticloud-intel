import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import { FEEDS } from "../../lib/feeds.js";
import { scoreArticle, normalizeTitle } from "../../lib/scoring-rules.js";
import { sendBrevoEmail } from "../../lib/email.js";

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
): Promise<{
  title: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  content: string;
} | null> {
  const articleContext = articles
    .map(
      (a) =>
        `- "${a.title}" (${a.source}, ${a.link})\n  ${a.description}`
    )
    .join("\n");

  const track = articles[0].track;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Write a blog post for the "${track}" topic based on these recent HIGH-priority articles:\n\n${articleContext}\n\nCombine insights from these articles into a single cohesive blog post. Link to the source articles within the text.`,
        },
      ],
      system: BLOG_PROMPT,
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

  // Use explicit credentials so blobs work in all invocation contexts
  // (scheduled, manual "Run now", CLI invoke, etc.)
  const siteID = process.env.SITE_ID;
  const blobToken = process.env.NETLIFY_API_TOKEN;
  const store =
    siteID && blobToken
      ? getStore({ name: "blog-drafts", siteID, token: blobToken })
      : getStore("blog-drafts"); // fallback for auto-injected context

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
          const pubDate =
            item.pubDate || item.isoDate || new Date().toISOString();
          const age = now - new Date(pubDate).getTime();
          if (age > WRITER_MAX_AGE_MS) continue;

          const title = item.title || "";
          const titleKey = normalizeTitle(title);
          if (seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);

          const description = (item.contentSnippet || item.content || "")
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300);
          const link = item.link || feed.url;
          const priority = scoreArticle(title, description, link, feed.source);

          if (priority === "HIGH") {
            articles.push({
              title,
              description,
              link,
              source: feed.source,
              track: feed.track,
              priority,
              pubDate,
            });
          }
        }
      } catch {
        // skip failed feeds
      }
    })
  );

  if (articles.length === 0) {
    console.log(
      "No HIGH-priority articles found this week — no drafts generated"
    );
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
      const data = (await store.get(blob.key, { type: "json" })) as {
        title?: string;
      } | null;
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
      .sort(
        (a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      )
      .slice(0, 2);

    // Skip if we already have a draft with a very similar title
    const candidateTopics = normalizeTitle(
      top.map((a) => a.title).join(" ")
    );
    if (
      existingDrafts.some((existing) => {
        const overlap = existing
          .split(" ")
          .filter((w) => candidateTopics.includes(w));
        return overlap.length > 5;
      })
    ) {
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
      sourceArticles: top.map((a) => ({
        title: a.title,
        link: a.link,
        source: a.source,
      })),
      keywords: result.keywords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };

    // Retry blob write once on failure
    try {
      await store.setJSON(draftId, draft);
    } catch (writeErr) {
      console.warn(`Blob write failed for "${result.title}", retrying...`, writeErr);
      try {
        await store.setJSON(draftId, draft);
      } catch (finalErr) {
        console.error(`Blob write failed after retry for "${result.title}"`, finalErr);
        errors.push(`${track} (storage error)`);
        continue;
      }
    }
    draftsCreated++;
    console.log(`Draft created: "${result.title}" [${track}]`);
  }

  // 5. Send notification email
  if (brevoKey && fromEmail && toEmail && draftsCreated > 0) {
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const errorNote =
      errors.length > 0
        ? `<p style="color:#f87171;font-size:13px;">Failed to generate drafts for: ${errors.join(", ")}</p>`
        : "";

    const sent = await sendBrevoEmail(brevoKey, {
      sender: { name: "Opticloud Intel", email: fromEmail },
      to: [{ email: toEmail }],
      subject: `Opticloud Blog: ${draftsCreated} New Draft${draftsCreated > 1 ? "s" : ""} Ready — ${today}`,
      htmlContent: `
        <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f1f5f9;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f97316;margin-bottom:8px;">OPTICLOUD BLOG</div>
          <h1 style="font-size:20px;margin:0 0 16px;">${draftsCreated} new draft${draftsCreated > 1 ? "s" : ""} ready for review</h1>
          <p style="color:#9ca3af;font-size:14px;">Head to the <a href="https://newsintel.netlify.app/drafts" style="color:#f97316;">Drafts dashboard</a> to review, edit, and approve.</p>
          ${errorNote}
        </div>`,
    });
    if (!sent) console.error("Failed to send blog notification email after retries");
  }

  console.log(
    `Blog writer complete: ${draftsCreated} drafts created, ${errors.length} errors`
  );
  return { statusCode: 200 };
});

export { handler };
