/**
 * One-shot test script — sends a sample digest email via Resend.
 * Run with: node scripts/send-test-digest.mjs
 *
 * Uses mock articles that mirror real digest output so you can
 * preview the exact email format before tomorrow's 9am UTC send.
 */

import { Resend } from "resend";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dep needed)
const envPath = join(__dirname, "../.env.local");
const env = {};
try {
  readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const [k, ...v] = line.split("=");
      if (k && v.length) env[k.trim()] = v.join("=").trim();
    });
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const RESEND_API_KEY = env.RESEND_API_KEY;
const DIGEST_TO_EMAIL = env.DIGEST_TO_EMAIL;

if (!RESEND_API_KEY || !DIGEST_TO_EMAIL) {
  console.error("Missing RESEND_API_KEY or DIGEST_TO_EMAIL in .env.local");
  process.exit(1);
}

// ── Mock articles representative of real digest output ─────────────────────
const mockArticles = [
  // Environmental AI Governance — HIGH (authoritative source)
  {
    track: "Environmental AI Governance",
    priority: "HIGH",
    title: "ITU-T Recommendation L.1801: Guidelines for assessing the environmental impact of AI systems",
    description: "The ITU-T Study Group 5 has published L.1801, establishing a standardized methodology for quantifying the environmental footprint of AI model training and inference workloads.",
    source: "ITU",
    link: "https://www.itu.int/rec/T-REC-L.1801/en",
    pubDate: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    track: "Environmental AI Governance",
    priority: "HIGH",
    title: "UN AI Advisory Body releases interim governance report on sustainable AI deployment",
    description: "The UN Secretary-General's Advisory Body on AI released its interim report calling for binding international standards on AI energy use and mandatory environmental disclosure for large-scale deployments.",
    source: "UN News",
    link: "https://news.un.org/en/story/2026/03/ai-advisory",
    pubDate: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    track: "Environmental AI Governance",
    priority: "HIGH",
    title: "EU AI Act environmental impact amendments pass committee vote",
    description: "The European Parliament's ITRE committee approved amendments requiring frontier AI providers to disclose energy consumption per training run and annual operational carbon footprint starting 2027.",
    source: "Google News: AI Governance",
    link: "https://news.google.com/articles/ai-act-env",
    pubDate: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    track: "Environmental AI Governance",
    priority: "MEDIUM",
    title: "IEEE working group publishes draft framework for measuring AI energy consumption",
    description: "IEEE P3157 working group released a draft standard for consistent measurement of AI system power usage effectiveness, open for public comment through April 2026.",
    source: "Google News: AI Standards Bodies",
    link: "https://news.google.com/articles/ieee-ai-energy",
    pubDate: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    track: "Environmental AI Governance",
    priority: "MEDIUM",
    title: "Microsoft and Google join voluntary AI sustainability pledge ahead of G7 summit",
    description: "Seven major AI labs committed to a voluntary framework for reporting Scope 2 and Scope 3 emissions from AI operations, to be formalized ahead of the G7 digital ministers meeting in May.",
    source: "Google News: Sustainable AI",
    link: "https://news.google.com/articles/ms-google-pledge",
    pubDate: new Date(Date.now() - 20 * 3600000).toISOString(),
  },

  // Energy & Data Centers — HIGH
  {
    track: "Energy & Data Centers",
    priority: "HIGH",
    title: "New federal ruling mandates PUE disclosure for hyperscale data centers over 20MW",
    description: "The DOE issued a final rule requiring all data center operators above 20MW to publicly report Power Usage Effectiveness and water consumption metrics quarterly, effective July 1, 2026.",
    source: "Data Center Knowledge",
    link: "https://www.datacenterknowledge.com/energy/federal-pue-disclosure",
    pubDate: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    track: "Energy & Data Centers",
    priority: "HIGH",
    title: "EPA proposes carbon tax framework for large-scale cloud infrastructure operators",
    description: "The EPA's proposed rule would impose a $45/metric ton carbon fee on Scope 1 and Scope 2 emissions from data centers exceeding 100MW capacity, with compliance beginning in fiscal year 2028.",
    source: "Google News: DC Energy",
    link: "https://news.google.com/articles/epa-carbon-cloud",
    pubDate: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
  {
    track: "Energy & Data Centers",
    priority: "MEDIUM",
    title: "Meta announces 100% renewable energy milestone for EMEA data center fleet",
    description: "Meta confirmed its European, Middle Eastern, and African data center operations are now fully matched with renewable energy certificates, ahead of its original 2030 target.",
    source: "Google News: Green DC",
    link: "https://news.google.com/articles/meta-renewable-emea",
    pubDate: new Date(Date.now() - 18 * 3600000).toISOString(),
  },

  // Cloud Computing — HIGH
  {
    track: "Cloud Computing",
    priority: "HIGH",
    title: "EU Cloud Sustainability Directive enters compliance enforcement phase Q2 2026",
    description: "Cloud providers operating in the EU must now demonstrate compliance with the Cloud Sustainability Directive's energy efficiency benchmarks or face fines of up to 2% of global annual turnover.",
    source: "The Register",
    link: "https://www.theregister.com/2026/03/eu-cloud-directive",
    pubDate: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    track: "Cloud Computing",
    priority: "HIGH",
    title: "AWS announces mandatory Scope 3 emissions reporting for enterprise customers",
    description: "AWS will begin including upstream and downstream Scope 3 emissions data in the Customer Carbon Footprint Tool starting Q3 2026, following pressure from institutional investors and EU taxonomy rules.",
    source: "AWS Blog",
    link: "https://aws.amazon.com/blogs/aws/scope3-reporting",
    pubDate: new Date(Date.now() - 9 * 3600000).toISOString(),
  },
  {
    track: "Cloud Computing",
    priority: "MEDIUM",
    title: "GCP carbon-intelligent compute expands to 15 new regions including Southeast Asia",
    description: "Google Cloud's carbon-intelligent workload scheduling, which shifts compute jobs to times and locations with lower-carbon electricity, is now available across 15 additional regions.",
    source: "Google News: Cloud Policy",
    link: "https://news.google.com/articles/gcp-carbon-expand",
    pubDate: new Date(Date.now() - 22 * 3600000).toISOString(),
  },

  // Indigenous & Conservation — HIGH
  {
    track: "Indigenous & Conservation",
    priority: "HIGH",
    title: "IUCN votes to recognize FPIC as binding obligation for infrastructure projects on ancestral lands",
    description: "At its World Conservation Congress, IUCN members passed Resolution 101 elevating Free, Prior and Informed Consent from a guideline to a binding requirement for any infrastructure development affecting indigenous territories.",
    source: "IUCN",
    link: "https://www.iucn.org/news/fpic-binding-vote",
    pubDate: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    track: "Indigenous & Conservation",
    priority: "MEDIUM",
    title: "Cultural Survival documents data sovereignty law violations across three Pacific nations",
    description: "A new report details how foreign cloud providers are storing indigenous community data outside national jurisdictions in Fiji, Vanuatu, and the Solomon Islands, in violation of recently enacted data sovereignty laws.",
    source: "Cultural Survival",
    link: "https://www.culturalsurvival.org/news/data-sovereignty-pacific",
    pubDate: new Date(Date.now() - 16 * 3600000).toISOString(),
  },
];

// ── Email HTML builder (mirrors daily-digest.mts exactly) ──────────────────
const TRACK_COLORS = {
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

function timeAgo(pubDate) {
  const diff = Date.now() - new Date(pubDate).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function buildEmailHtml(articles) {
  const byTrack = {};
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
    const shown = [...high.slice(0, 4), ...medium.slice(0, 2)];
    if (shown.length === 0) continue;

    const cards = shown.map((a) => {
      const p = PRIORITY_COLORS[a.priority];
      return `
        <div style="margin-bottom:12px;padding:14px 16px;background:#0f0f0f;border:1px solid ${p.border}33;border-left:3px solid ${p.border};border-radius:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;letter-spacing:0.08em;padding:2px 8px;border-radius:999px;background:${p.bg};color:${p.text};border:1px solid ${p.border}44;">${p.label}</span>
            <span style="font-size:10px;color:#6b7280;">${a.source}</span>
            <span style="font-size:10px;color:#4b5563;margin-left:auto;">${timeAgo(a.pubDate)}</span>
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
      <p style="margin:6px 0 0;font-size:11px;color:#374151;">⚠️ TEST EMAIL — sample data, not live articles</p>
    </div>
    ${sections}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1f1f1f;font-size:11px;color:#374151;text-align:center;">
      Opticloud Intel · Automated daily digest · <a href="https://playful-douhua-3ed339.netlify.app" style="color:#f97316;text-decoration:none;">View live dashboard →</a>
    </div>
  </div>
</body>
</html>`;
}

// ── Send ────────────────────────────────────────────────────────────────────
const resend = new Resend(RESEND_API_KEY);
const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

console.log(`Sending test digest to ${DIGEST_TO_EMAIL}...`);

const { data, error } = await resend.emails.send({
  from: "Opticloud Intel <onboarding@resend.dev>",
  to: DIGEST_TO_EMAIL,
  subject: `[TEST] Opticloud Intel: Daily Brief — ${today}`,
  html: buildEmailHtml(mockArticles),
});

if (error) {
  console.error("❌ Send failed:", error);
  process.exit(1);
}

console.log(`✅ Test digest sent! Email ID: ${data.id}`);
console.log(`   Check ${DIGEST_TO_EMAIL} for the preview.`);
