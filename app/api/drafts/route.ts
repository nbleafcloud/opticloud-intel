import { NextRequest, NextResponse } from "next/server";
import { listDrafts } from "@/lib/blobs";
import type { BlogDraft } from "@/types";

const VALID_STATUSES: BlogDraft["status"][] = ["draft", "approved", "published"];

export async function GET(request: NextRequest) {
  const rawStatus = request.nextUrl.searchParams.get("status");
  const status = rawStatus && VALID_STATUSES.includes(rawStatus as BlogDraft["status"])
    ? (rawStatus as BlogDraft["status"])
    : undefined;
  try {
    const drafts = await listDrafts(status);
    return NextResponse.json(drafts);
  } catch (err) {
    console.error("Failed to list drafts:", err);
    return NextResponse.json(
      { error: "Failed to list drafts" },
      { status: 500 }
    );
  }
}
