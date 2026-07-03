/**
 * Go-live readiness check (Phase 6). Run against the PRODUCTION database:
 *
 *   POSTGRES_URL=<prod url> HUB_DEMO_LOGIN=false node scripts/go-live-check.mjs
 *
 * (reads .env.local automatically when POSTGRES_URL is unset — handy locally,
 * but for go-live point it explicitly at prod.)
 *
 * Verifies the things that silently break a real carrier on day one:
 *   1. every migrations/hub/*.sql file is applied (incl. 012 fuel load_id)
 *   2. fuel_transactions.load_id actually exists (the column 012 adds)
 *   3. demo accounts are locked out (HUB_DEMO_LOGIN=false) or flagged
 *   4. durable file storage + SMTP are configured (warn-only)
 *   5. configured sidecars require HAULDESK_SIDECAR_SECRET (warn-only)
 *   6. at least one real (non-demo) active office user exists
 *
 * Exit 0 = ready; exit 1 = at least one blocking failure. Warnings don't block.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
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

const results = []
function pass(name, detail = "") { results.push({ level: "pass", name, detail }) }
function warn(name, detail = "") { results.push({ level: "warn", name, detail }) }
function fail(name, detail = "") { results.push({ level: "fail", name, detail }) }

async function main() {
  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) {
    console.error("POSTGRES_URL is required (point it at the PRODUCTION database)")
    process.exit(1)
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()

  try {
    // 1. All migrations applied
    const dir = path.join(process.cwd(), "migrations", "hub")
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    const { rows: appliedRows } = await client.query("SELECT name FROM public.hub_migrations")
    const applied = new Set(appliedRows.map((r) => r.name))
    const missing = files.filter((f) => !applied.has(f))
    if (missing.length === 0) {
      pass(`migrations: all ${files.length} applied`)
    } else {
      fail(`migrations: ${missing.length} not applied`, `run npm run db:migrate — missing: ${missing.join(", ")}`)
    }

    // 2. The fuel load_id column exists (what 012 adds; fuel→load linking dies without it)
    const { rows: col } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'hub' AND table_name = 'fuel_transactions' AND column_name = 'load_id'`
    )
    if (col.length > 0) pass("fuel_transactions.load_id exists (migration 012 live)")
    else fail("fuel_transactions.load_id missing", "fuel→load linking will error — run npm run db:migrate")

    // 3. Demo accounts locked out
    const demoOff = process.env.HUB_DEMO_LOGIN === "false"
    const { rows: demo } = await client.query(
      `SELECT COUNT(*)::int AS n FROM hub.users WHERE email LIKE '%@demo.thind' AND active`
    )
    if (demo[0].n === 0) {
      pass("no active demo accounts in hub.users")
    } else if (demoOff) {
      pass(`${demo[0].n} demo account(s) present but HUB_DEMO_LOGIN=false blocks their sign-in`,
        "confirm the same env var is set in Vercel production")
    } else {
      fail(`${demo[0].n} active demo account(s) and HUB_DEMO_LOGIN is not 'false'`,
        "set HUB_DEMO_LOGIN=false in Vercel (hides the hint AND refuses demo sign-in)")
    }

    // 4. Durable file storage (Vercel's filesystem is ephemeral — POD uploads
    //    and invoice/settlement PDFs vanish without Blob storage)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      pass("BLOB_READ_WRITE_TOKEN set — uploads/PDFs stored durably")
    } else {
      warn("BLOB_READ_WRITE_TOKEN not set",
        "on Vercel, POD uploads and generated PDFs will be lost between invocations — add Vercel Blob")
    }

    // 5. Email (invoices/settlements email themselves; without SMTP they fall back to manual send)
    if ((process.env.SMTP_USER || process.env.EMAIL_USER) && (process.env.SMTP_PASS || process.env.EMAIL_PASS)) {
      pass("SMTP configured — invoices/settlement statements email automatically")
    } else {
      warn("SMTP not configured", "invoices/statements must be downloaded and sent manually (set SMTP_USER/SMTP_PASS)")
    }

    // 6. Sidecar auth (Go/Rust sidecars verify HAULDESK_SIDECAR_SECRET; without it
    //    a deployed sidecar accepts unauthenticated requests from anyone with the URL)
    const sidecarUrls = [
      process.env.HAULDESK_GO_WORKER_URL,
      process.env.HAULDESK_RUST_COMPUTE_URL,
    ].filter(Boolean)
    if (sidecarUrls.length === 0) {
      pass("sidecars off — pure TypeScript fallbacks in use")
    } else if (process.env.HAULDESK_SIDECAR_SECRET) {
      pass(`${sidecarUrls.length} sidecar(s) configured with HAULDESK_SIDECAR_SECRET`)
    } else {
      warn(`${sidecarUrls.length} sidecar URL(s) set but HAULDESK_SIDECAR_SECRET is not`,
        "deployed sidecars accept unauthenticated requests — set the same secret on Next.js and both sidecars (see docs/architecture/trilingual-stack.md)")
    }

    // 7. Real office users exist
    const { rows: office } = await client.query(
      `SELECT COUNT(*)::int AS n FROM hub.users
       WHERE role IN ('owner','dispatcher','accountant') AND active AND email NOT LIKE '%@demo.thind'`
    )
    if (office[0].n > 0) pass(`${office[0].n} real office user(s) can sign in`)
    else fail("no real office users", "create the owner via /hub/signup, then invite staff in Settings → Users")
  } finally {
    await client.end()
  }

  const icon = { pass: "✓", warn: "△", fail: "✗" }
  let failed = 0
  console.log("\nGo-live readiness\n─────────────────")
  for (const r of results) {
    if (r.level === "fail") failed++
    console.log(`${icon[r.level]} ${r.name}${r.detail ? `\n    ${r.detail}` : ""}`)
  }
  console.log(failed === 0 ? "\nReady to go live." : `\n${failed} blocking item(s) — fix and re-run.`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("go-live-check failed:", err.message)
  process.exit(1)
})
