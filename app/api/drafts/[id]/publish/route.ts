import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft } from "@/lib/blobs";
import { requireAuth, isValidDraftId } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidDraftId(id))
    return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
  try {
    const draft = await getDraft(id);
    if (!draft)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (draft.status !== "approved") {
      return NextResponse.json(
        { error: "Draft must be approved before publishing" },
        { status: 400 }
      );
    }

    const published = {
      ...draft,
      status: "published" as const,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveDraft(published);
    return NextResponse.json(published);
  } catch (err) {
    console.error("Failed to publish draft:", err);
    return NextResponse.json(
      { error: "Failed to publish" },
      { status: 500 }
    );
  }
}
