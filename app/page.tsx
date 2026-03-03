import { fetchAllFeeds } from "@/lib/rss";
import { scoreAndSort } from "@/lib/scorer";
import Header from "@/components/Header";
import FeedClient from "@/components/FeedClient";

export const revalidate = 3600; // re-fetch every hour

export default async function Home() {
  let articles = await fetchAllFeeds();
  articles = await scoreAndSort(articles);

  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient glow top-left */}
      <div className="fixed -top-64 -left-64 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      {/* Ambient glow top-right */}
      <div className="fixed -top-32 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      <Header articleCount={articles.length} lastUpdated={lastUpdated} />

      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <FeedClient articles={articles} />
      </main>
    </div>
  );
}
