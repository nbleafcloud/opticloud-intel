# Codebase Hardening & Updates — Design

## Scope
Fix 14 issues across security, correctness, reliability, and DRY concerns.

## Changes

### Security (items 1-7)
1. **Model ID → env var** — `CLAUDE_MODEL` env var with fallback
2. **Auth hardening** — fail-closed when `DRAFT_AUTH_TOKEN` missing in production
3. **Security headers** — add CSP, X-Frame-Options, etc. in next.config.ts
4. **Scoring keyword word-boundary matching** — use regex `\b` instead of `.includes()`
5. **Email HTML escaping** — escape titles/descriptions before injecting into HTML
6. **SITE_URL env var** — `NEXT_PUBLIC_SITE_URL` with fallback
7. **robots.txt** — Disallow /drafts/ and /api/

### Reliability (items 8-13)
8. **Extract shared feed-fetcher** — new `lib/feed-fetcher.ts` used by both functions
9. **Log feed failures** — add `console.warn` in feed catch blocks
10. **Promise.allSettled in blobs.ts** — don't let one bad blob kill the list
11. **Complete .env.example** — document all 7+ env vars
12. **Blog revalidation** — increase from 60s to 3600s (1 hour)
13. **Email timeout + backoff** — add AbortController timeout, exponential retry

### Quality (item 14)
14. **Fix type duplication** — single `Track` type source of truth + date validation in ArticleCard
