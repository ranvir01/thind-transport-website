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
 *   7. NEXTAUTH_SECRET/AUTH_SECRET, CREDENTIALS_KEY, CRON_SECRET are set
 *      (docs/hub-go-live-requirements.md §1 lists all three as required before login)
 *   8. vercel.json crons are Hobby-safe (no schedule fires more than once/day —
 *      Vercel Hobby rejects those at deploy time before build — and the total
 *      job count stays under Vercel's per-project cap)
 *   9. NEXTAUTH_URL is set and https (warn-only — Auth.js v5 can infer the URL
 *      on Vercel via trustHost, but §1 lists it and a wrong value breaks callbacks)
 *  10. free API keys FMCSA_WEBKEY / EIA_API_KEY (§3; warn-only — without them
 *      broker vetting and the diesel index stay on manual/CSV fallback)
 *  11. VAPID web-push keys are both set or both unset (§6; warn on a partial
 *      pair — notify.ts silently disables push unless BOTH keys exist)
 *
 * Exit 0 = ready; exit 1 = at least one blocking failure. Warnings don't block.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
import path from "node:path"
import pg from "pg"
import { hobbyIllegalCrons, exceedsHobbyJobCount, MAX_CRON_JOBS_PER_PROJECT } from "./hobby-cron-guard.mjs"

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
      pass("SMTP configured — invoices/settlement statements email automatically",
        process.env.SMTP_FROM ? "" : "SMTP_FROM not set — from-address falls back to SMTP_USER / noreply@thindtransport.com")
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

    // 8. Auth/credentials/cron secrets (all "required before anyone logs in" per
    //    docs/hub-go-live-requirements.md §1, but none were verified until now)
    if (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET) {
      pass("NEXTAUTH_SECRET/AUTH_SECRET set — sessions signed")
    } else {
      fail("NEXTAUTH_SECRET/AUTH_SECRET not set", "set one (openssl rand -base64 32) — Auth.js can't sign sessions without it")
    }

    if (process.env.CREDENTIALS_KEY && process.env.CREDENTIALS_KEY.length >= 16) {
      pass("CREDENTIALS_KEY set — integration credentials encrypt at rest")
    } else {
      fail("CREDENTIALS_KEY not set (32+ chars)", "without it, credential storage is disabled and every integration stays on the CSV path")
    }

    if (process.env.CRON_SECRET) {
      pass("CRON_SECRET set — /api/hub/cron/* protected")
    } else {
      fail("CRON_SECRET not set", "api/hub/cron/[job]/route.ts:41 refuses every request when the secret is unset, so all 17 vercel.json crons 401 silently — including migrate, which is how a deploy's migrations reach production")
    }

    // 9. Hobby-safe vercel.json crons (deploy fails before build otherwise)
    try {
      const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf-8"))
      const illegal = hobbyIllegalCrons(vercel)
      const jobCount = (vercel.crons ?? []).length
      if (illegal.length === 0 && !exceedsHobbyJobCount(vercel)) {
        pass(`vercel.json crons Hobby-safe (${jobCount} daily-or-less, under the ${MAX_CRON_JOBS_PER_PROJECT}-job cap)`)
      } else {
        const reasons = illegal.map(
          (c) => `${c.path} schedule "${c.schedule}" fires ${c.firingsPerDay}×/day — Hobby allows once/day`
        )
        if (exceedsHobbyJobCount(vercel)) {
          reasons.push(`${jobCount} cron jobs declared — Vercel allows at most ${MAX_CRON_JOBS_PER_PROJECT} per project`)
        }
        fail(`vercel.json has ${reasons.length} Hobby cron problem(s)`, reasons.join("; "))
      }
    } catch (err) {
      fail("vercel.json cron check failed", err instanceof Error ? err.message : String(err))
    }

    // 10. NEXTAUTH_URL (§1 lists it as required; warn-only because Auth.js v5
    //     infers the URL on Vercel when trustHost is on — but if it IS set it
    //     must be the real https hub origin or OAuth/signin callbacks break)
    const nextauthUrl = process.env.NEXTAUTH_URL
    if (!nextauthUrl) {
      warn("NEXTAUTH_URL not set",
        "set https://thindtransport.com (or your hub domain) in Vercel — Auth.js infers it on Vercel, but an explicit value avoids callback surprises")
    } else if (!/^https:\/\//.test(nextauthUrl) || /localhost|127\.0\.0\.1/.test(nextauthUrl)) {
      warn(`NEXTAUTH_URL is "${nextauthUrl}"`,
        "production must be the real https hub origin — sign-in callbacks redirect here")
    } else {
      pass(`NEXTAUTH_URL set (${nextauthUrl})`)
    }

    // 11. Free API keys (§3) — warn-only: features degrade to manual/CSV fallback
    if (process.env.FMCSA_WEBKEY) pass("FMCSA_WEBKEY set — broker MC/DOT vetting live")
    else warn("FMCSA_WEBKEY not set", "broker vetting falls back to manual lookup — free key at mobile.fmcsa.dot.gov")

    if (process.env.EIA_API_KEY) pass("EIA_API_KEY set — weekly diesel index on /hub/fuel")
    else warn("EIA_API_KEY not set", "diesel benchmark chart stays empty — free key at eia.gov/opendata")

    // 12. Web push key pair (§6) — notify.ts requires BOTH keys; a partial pair
    //     means someone intended to enable push and it is silently off
    const vapidPub = process.env.VAPID_PUBLIC_KEY
    const vapidPriv = process.env.VAPID_PRIVATE_KEY
    if (vapidPub && vapidPriv) {
      pass("VAPID key pair set — driver web-push notifications enabled")
    } else if (vapidPub || vapidPriv) {
      warn(`only VAPID_${vapidPub ? "PUBLIC" : "PRIVATE"}_KEY is set`,
        "push stays silently disabled until BOTH keys are set — npx web-push generate-vapid-keys")
    } else {
      pass("web push off — no VAPID keys set (optional; drivers still see in-app notifications)")
    }
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
