import { NextResponse } from "next/server"
import { queryOne } from "@/lib/hub/db"

// Deployment identity for the production staleness check (scripts/prod-smoke.mjs)
// AND the uptime target (Task 5): an external pinger can alert on http != 200
// or db != true. Vercel stamps VERCEL_GIT_COMMIT_SHA into every deployment; the
// smoke compares it against origin/main to catch a drain that moved the alias
// without building. Public and unauthenticated by design — it exposes only
// which commit is live, whether the database answers, and how many migrations
// are applied (a bare count; no schema or version detail).
export const dynamic = "force-dynamic"

export async function GET() {
  let db = false
  let migrations: number | null = null
  try {
    const row = await queryOne<{ n: string }>(`SELECT COUNT(*) AS n FROM public.hub_migrations`)
    db = true
    migrations = Number(row?.n ?? 0)
  } catch {
    // db stays false — that IS the signal; never let the health check throw.
  }
  return NextResponse.json(
    {
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? "development",
      db,
      migrations,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
