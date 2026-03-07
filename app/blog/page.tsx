import Header from "@/components/Header";
import BlogPostCard from "@/components/BlogPostCard";
import { listDrafts } from "@/lib/blobs";
import type { BlogDraft } from "@/types";

export const revalidate = 3600; // refresh every hour — blog content changes weekly at most

export const metadata = {
  title: "Opticloud Blog — Cloud Sustainability Insights",
  description:
    "Expert analysis on cloud optimization, sustainability regulations, and environmental AI governance.",
};

export default async function BlogPage() {
  let posts: BlogDraft[];
  try {
    posts = await listDrafts("published");
  } catch {
    posts = [];
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div
        className="fixed inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="fixed -top-32 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <Header />

      <main className="relative mx-auto max-w-3xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white/90 mb-2">
            Opticloud Blog
          </h1>
          <p className="text-sm text-white/40">
            Cloud sustainability insights and analysis
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-12 text-center">
            <p className="text-white/40 text-sm">
              No posts published yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
