import { NextResponse } from "next/server"

// Deployment identity for the production staleness check (scripts/prod-smoke.mjs).
// Vercel stamps VERCEL_GIT_COMMIT_SHA into every deployment; the smoke compares
// it against origin/main to catch a drain that moved the alias without building.
// Public and unauthenticated by design — it exposes only which commit is live.
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json(
    {
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? "development",
    },
    { headers: { "cache-control": "no-store" } }
  )
}
