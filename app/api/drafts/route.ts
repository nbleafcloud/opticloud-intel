import { NextRequest, NextResponse } from "next/server";
import { listDrafts } from "@/lib/blobs";
import type { BlogDraft } from "@/types";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as
    | BlogDraft["status"]
    | null;
  try {
    const drafts = await listDrafts(status || undefined);
    return NextResponse.json(drafts);
  } catch (err) {
    console.error("Failed to list drafts:", err);
    return NextResponse.json(
      { error: "Failed to list drafts" },
      { status: 500 }
    );
  }
}
