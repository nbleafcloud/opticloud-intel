import { NextRequest, NextResponse } from "next/server";

export function isAuthenticated(request: NextRequest): boolean {
  const token = process.env.DRAFT_AUTH_TOKEN;
  if (!token) {
    // Fail-closed: only allow unauthenticated access in development
    if (process.env.NODE_ENV === "development") return true;
    console.error("DRAFT_AUTH_TOKEN not set in production — blocking request");
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${token}`) return true;

  // Check cookie (set by the drafts UI after login)
  const cookieToken = request.cookies.get("draft_token")?.value;
  if (cookieToken === token) return true;

  return false;
}

/**
 * Checks that a request is authorized to mutate drafts.
 * In dev mode (no DRAFT_API_TOKEN set), all requests are allowed.
 * In production, requires a matching Bearer token or cookie.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = process.env.DRAFT_API_TOKEN;

  // If no token configured, allow all (dev mode)
  if (!token) return null;

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${token}`) return null;

  // Check cookie (set by the drafts UI after login)
  const cookieToken = request.cookies.get("draft_token")?.value;
  if (cookieToken === token) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Validates that a draft ID matches the expected pattern. */
export function isValidDraftId(id: string): boolean {
  // IDs are either "draft-{timestamp}-{slug}" or a simple alphanumeric slug
  return /^[a-z0-9][a-z0-9\-]{0,120}$/.test(id);
}
