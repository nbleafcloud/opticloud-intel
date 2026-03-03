import { schedule } from "@netlify/functions";
import { Resend } from "resend";
import Parser from "rss-parser";
import { FEEDS } from "../../lib/feeds.js";
import { HIGH_KEYWORDS, LOW_KEYWORDS, isAuthoritativeSource } from "../../lib/scoring-rules.js";

const DIGEST_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

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

interface DigestArticle {
  title: string;
  link: string;
  source: string;
  track: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  pubDate: string;
}

const TRACK_COLORS: Record<string, string> = {
  "Energy & Data Centers": "#3b82f6",
  "Cloud Computing": "#a855f7",
  "Indigenous & Conservation": "#14b8a6",
  "Environmental AI Governance": "#f97316",
};

const PRIORITY_COLORS = {
  HIGH: { bg: "#450a0a", border: "#ef4444", text: "#fca5a5", label: "🔴 HIGH" },
  MEDIUM: { bg: "#451a03", border: "#f59e0b", text: "#fcd34d", label: "🟡 MED" },
  LOW: { bg: "#052e16", border: "#22c55e", text: "#86efac", label: "🟢 LOW" },
};

function buildEmailHtml(articles: DigestArticle[]): string {
  const byTrack: Record<string, DigestArticle[]> = {};
  for (const a of articles) {
    if (!byTrack[a.track]) byTrack[a.track] = [];
    byTrack[a.track].push(a);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  let sections = "";
  for (const [track, items] of Object.entries(byTrack)) {
    const color = TRACK_COLORS[track] || "#6b7280";
    const high = items.filter((a) => a.priority === "HIGH");
    const medium = items.filter((a) => a.priority === "MEDIUM");
    // Strict curation: top 4 HIGH + top 2 MEDIUM per track
    const shown = [...high.slice(0, 4), ...medium.slice(0, 2)];
    if (shown.length === 0) continue;

    const cards = shown.map((a) => {
      const p = PRIORITY_COLORS[a.priority];
      const timeAgo = (() => {
        const diff = Date.now() - new Date(a.pubDate).getTime();
        const h = Math.floor(diff / 3_600_000);
        if (h < 1) return "just now";
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
      })();
      return `
        <div style="margin-bottom:12px;padding:14px 16px;background:#0f0f0f;border:1px solid ${p.border}33;border-left:3px solid ${p.border};border-radius:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;letter-spacing:0.08em;padding:2px 8px;border-radius:999px;background:${p.bg};color:${p.text};border:1px solid ${p.border}44;">${p.label}</span>
            <span style="font-size:10px;color:#6b7280;">${a.source}</span>
            <span style="font-size:10px;color:#4b5563;margin-left:auto;">${timeAgo}</span>
          </div>
          <a href="${a.link}" style="color:#f1f5f9;font-size:14px;font-weight:500;text-decoration:none;line-height:1.4;">${a.title}</a>
        </div>`;
    }).join("");

    sections += `
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #1f1f1f;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;"></span>
          <h2 style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${color};">${track}</h2>
          <span style="font-size:11px;color:#4b5563;margin-left:auto;">${high.length} high · ${medium.length} medium (last 48h)</span>
        </div>
        ${cards}
      </div>`;
  }

  const totalHigh = articles.filter((a) => a.priority === "HIGH").length;
  const totalMed = articles.filter((a) => a.priority === "MEDIUM").length;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #1f1f1f;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f97316;margin-bottom:8px;">OPTICLOUD INTEL</div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f1f5f9;">Daily Intelligence Brief</h1>
      <p style="margin:0;font-size:13px;color:#6b7280;">${today} · ${totalHigh} high priority · ${totalMed} medium priority · last 48h only</p>
    </div>
    ${sections}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1f1f1f;font-size:11px;color:#374151;text-align:center;">
      Opticloud Intel · Automated daily digest · <a href="https://playful-douhua-3ed339.netlify.app" style="color:#f97316;text-decoration:none;">View live dashboard →</a>
    </div>
  </div>
</body>
</html>`;
}

const handler = schedule("0 9 * * *", async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.DIGEST_TO_EMAIL;
  if (!apiKey || !toEmail) {
    console.error("Missing RESEND_API_KEY or DIGEST_TO_EMAIL");
    return { statusCode: 500 };
  }

  // Support comma-separated CC recipients (e.g., VP's email)
  const ccEmails = process.env.DIGEST_CC_EMAILS
    ? process.env.DIGEST_CC_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  const parser = new Parser({ timeout: 10000 });
  const articles: DigestArticle[] = [];
  const seenTitles = new Set<string>();
  const now = Date.now();

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const result = await parser.parseURL(feed.url);
        for (const item of (result.items || []).slice(0, 15)) {
          const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
          const age = now - new Date(pubDate).getTime();
          // Digest only covers last 48 hours
          if (age > DIGEST_MAX_AGE_MS) continue;

          const title = item.title || "";
          const titleKey = normalizeTitle(title);
          if (seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);

          const description = item.contentSnippet || item.content || "";
          const link = item.link || feed.url;
          const priority = scoreArticle(title, description, link, feed.source);
          if (priority === "LOW") continue;

          articles.push({ title, link, source: feed.source, track: feed.track, priority, pubDate });
        }
      } catch {
        // skip failed feeds
      }
    })
  );

  // Sort: HIGH first, then by date
  articles.sort((a, b) => {
    if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
    if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  if (articles.length === 0) {
    console.log("No articles in last 48h to send today");
    return { statusCode: 200 };
  }

  const resend = new Resend(apiKey);
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const { error } = await resend.emails.send({
    from: "Opticloud Intel <onboarding@resend.dev>",
    to: toEmail,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    subject: `Opticloud Intel: Daily Brief — ${today}`,
    html: buildEmailHtml(articles),
  });

  if (error) {
    console.error("Resend error:", error);
    return { statusCode: 500 };
  }

  console.log(`Digest sent to ${toEmail}${ccEmails.length ? ` (CC: ${ccEmails.join(", ")})` : ""} with ${articles.length} articles`);
  return { statusCode: 200 };
});

export { handler };

