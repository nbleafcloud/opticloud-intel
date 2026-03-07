import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft, deleteDraft } from "@/lib/blobs";
import { requireAuth, isValidDraftId } from "@/lib/auth";
import type { BlogDraft } from "@/types";

const INVALID_ID = NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidDraftId(id)) return INVALID_ID;
  try {
    const draft = await getDraft(id);
    if (!draft)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(draft);
  } catch (err) {
    console.error("Failed to get draft:", err);
    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidDraftId(id)) return INVALID_ID;
  try {
    const existing = await getDraft(id);
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();

    // Validate field types and lengths
    if (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 200))
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    if (body.metaDescription !== undefined && (typeof body.metaDescription !== "string" || body.metaDescription.length > 300))
      return NextResponse.json({ error: "Invalid meta description" }, { status: 400 });
    if (body.content !== undefined && (typeof body.content !== "string" || body.content.length > 50000))
      return NextResponse.json({ error: "Content too long" }, { status: 400 });
    if (body.keywords !== undefined && (!Array.isArray(body.keywords) || body.keywords.length > 20))
      return NextResponse.json({ error: "Invalid keywords" }, { status: 400 });
    if (body.status !== undefined && !["draft", "approved", "published"].includes(body.status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    // Whitelist allowed fields to prevent injection of arbitrary data
    const ALLOWED_FIELDS: (keyof BlogDraft)[] = [
      "title",
      "metaDescription",
      "content",
      "keywords",
      "status",
    ];
    const updates: Partial<BlogDraft> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    const updated: BlogDraft = {
      ...existing,
      ...updates,
      id, // prevent ID change
      updatedAt: new Date().toISOString(),
    };
    await saveDraft(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update draft:", err);
    return NextResponse.json(
      { error: "Failed to update draft" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidDraftId(id)) return INVALID_ID;
  try {
    await deleteDraft(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Failed to delete draft:", err);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
