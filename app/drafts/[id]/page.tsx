import { getDraft } from "@/lib/blobs";
import Header from "@/components/Header";
import DraftEditor from "@/components/DraftEditor";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function DraftEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await getDraft(decodeURIComponent(id));
  if (!draft) notFound();

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
      <Header />
      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <DraftEditor draft={draft} />
      </main>
    </div>
  );
}
