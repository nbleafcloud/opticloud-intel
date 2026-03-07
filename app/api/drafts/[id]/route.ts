import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft, deleteDraft } from "@/lib/blobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const { id } = await params;
  try {
    const existing = await getDraft(id);
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates = await request.json();
    const updated = {
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
