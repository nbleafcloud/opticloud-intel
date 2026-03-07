import Header from "@/components/Header";
import DraftCard from "@/components/DraftCard";
import { listDrafts } from "@/lib/blobs";
import type { BlogDraft } from "@/types";

export const revalidate = 0; // Always fresh

export default async function DraftsPage() {
  let drafts: BlogDraft[];
  try {
    drafts = await listDrafts();
  } catch {
    drafts = [];
  }

  const draftCount = drafts.filter((d) => d.status === "draft").length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const publishedCount = drafts.filter((d) => d.status === "published").length;

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
      <div className="fixed -top-64 -left-64 h-[500px] w-[500px] rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

      <Header />

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white/90 mb-2">
            Blog Drafts
          </h1>
          <div className="flex gap-4 text-xs text-white/40">
            <span>{draftCount} pending</span>
            <span>{approvedCount} approved</span>
            <span>{publishedCount} published</span>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-12 text-center">
            <p className="text-white/40 text-sm">
              No drafts yet. The blog writer runs every Monday at 10 AM UTC.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
