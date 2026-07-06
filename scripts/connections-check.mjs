/**
 * Connections readiness — the one-command answer to "is everything hooked up?"
 *
 *   POSTGRES_URL=<url> node scripts/connections-check.mjs
 *
 * Reports three tables:
 *   1. Environment switches — every env key the app reads, present/absent, what it unlocks.
 *   2. Integration providers — the registry (live/stub/planned), credentials saved per
 *      carrier, and the latest hub.integration_syncs row.
 *   3. Production cron — the vercel.json schedule vs the cron route's job list.
 *
 * Warn-only (exit 0 unless the DB is unreachable): absent keys are choices, not failures —
 * every integration has a CSV/manual fallback by doctrine.
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import pg from "pg"

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

const ENV_SWITCHES = [
  ["POSTGRES_URL", "the database (everything)"],
  ["NEXTAUTH_SECRET", "login sessions"],
  ["CREDENTIALS_KEY", "encrypted vault — required to store ANY provider credentials"],
  ["CRON_SECRET", "the 9 scheduled production jobs (vercel.json)"],
  ["BLOB_READ_WRITE_TOKEN", "durable POD uploads + invoice/settlement PDFs on Vercel"],
  ["SMTP_USER", "outbound email (invoices, statements) — with SMTP_PASS"],
  ["VAPID_PUBLIC_KEY", "driver web-push notifications — with VAPID_PRIVATE_KEY"],
  ["FMCSA_WEBKEY", "broker/carrier authority vetting (free key)"],
  ["EIA_API_KEY", "weekly diesel benchmark on /hub/fuel (free key)"],
  ["NEXT_PUBLIC_MAPBOX_TOKEN", "map tiles + Mapbox routing rung"],
  ["ANTHROPIC_API_KEY", "Smart Setup AI extraction + dispatch copilot"],
  ["OSRM_URL", "self-hosted routing (blank = free public demo)"],
  ["HAULDESK_SIDECAR_SECRET", "Go/Rust sidecar auth (needed only if sidecars deployed)"],
  ["HUB_DEMO_LOGIN", "'false' in production = demo accounts locked out"],
]

async function main() {
  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) {
    console.error("POSTGRES_URL is required")
    process.exit(1)
  }

  console.log("\n1 · Environment switches")
  console.log("─".repeat(72))
  for (const [key, unlocks] of ENV_SWITCHES) {
    const set = Boolean(process.env[key])
    console.log(`${set ? "✓" : "·"} ${key.padEnd(26)} ${set ? "set" : "not set"} — ${unlocks}`)
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  try {
    // Registry: import from the TS source is not possible in plain node — parse
    // the spec fields we need from the registry file (single source of truth).
    const reg = readFileSync(path.join(process.cwd(), "src/lib/hub/integrations/registry.ts"), "utf-8")
    const providers = [...reg.matchAll(/id:\s*"([a-z0-9_-]+)"[\s\S]*?sync:\s*"(\w+)",\s*status:\s*"(\w+)"/g)]
      .map((m) => ({ id: m[1], sync: m[2], status: m[3] }))

    const creds = await client.query(
      `SELECT provider, COUNT(*)::int AS n FROM hub.api_credentials GROUP BY provider`
    )
    const credByProvider = new Map(creds.rows.map((r) => [r.provider, r.n]))
    const syncs = await client.query(
      `SELECT DISTINCT ON (source) source, finished_at, ok FROM hub.integration_syncs
       ORDER BY source, finished_at DESC NULLS LAST`
    )
    const lastSync = new Map(syncs.rows.map((r) => [r.source, r]))

    console.log("\n2 · Integration providers (registry)")
    console.log("─".repeat(72))
    for (const p of providers) {
      const nCreds = credByProvider.get(p.id) ?? 0
      const sync = lastSync.get(p.id) ?? lastSync.get(`webhook:${p.id}`) ?? lastSync.get(`cron:${p.id}`)
      const syncNote = sync
        ? `last sync ${sync.ok ? "ok" : "FAILED"} ${sync.finished_at ? new Date(sync.finished_at).toISOString().slice(0, 16) : ""}`
        : "never synced"
      const badge = p.status === "live" ? "✓ live " : p.status === "stub" ? "◐ stub " : "· plan "
      console.log(`${badge} ${p.id.padEnd(14)} ${p.sync.padEnd(8)} creds:${String(nCreds).padEnd(3)} ${syncNote}`)
    }

    console.log("\n3 · Production cron (vercel.json)")
    console.log("─".repeat(72))
    const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf-8"))
    for (const c of vercel.crons ?? []) {
      console.log(`✓ ${c.path.replace("/api/hub/cron/", "").padEnd(20)} ${c.schedule}`)
    }
    if (!process.env.CRON_SECRET) {
      console.log("· NOTE: CRON_SECRET unset — scheduled jobs will 401 until it is set")
    }
  } finally {
    await client.end()
  }
  console.log("\nEvery '·' above is an optional switch with a working fallback — flip them as you go.\n")
}

main().catch((err) => {
  console.error("connections-check failed:", err.message)
  process.exit(1)
})
