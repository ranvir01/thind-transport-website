/**
 * Run the whole Puppeteer smoke suite — every scripts/e2e-*-smoke.mjs in
 * name order, then the screen sweep — with one summary and one exit code.
 * Codifies the drive every QA session was re-assembling by hand (a shell
 * loop here, an ad-hoc list there), so "full suite green" always means the
 * same set of scripts.
 *
 * Prereqs are the suite's usual ones (see e2e-lib.mjs header): server
 * running against a migrated + seeded Postgres, NEXTAUTH_SECRET set.
 * State-consuming smokes reseed themselves; scripts run sequentially so
 * their reseeds never race.
 *
 * Usage:
 *   node scripts/e2e-run-all.mjs [filter ...]  # only smokes whose name
 *                                               # contains any filter term
 *   node scripts/e2e-run-all.mjs driver dvir   # just the driver-side pair
 *   SKIP_SWEEP=1 node scripts/e2e-run-all.mjs  # smokes only
 *
 * Per-script output lands in e2e-shots-logs/<name>.log (covered by the
 * "e2e-shots*" gitignore entry); on failure the last lines are echoed so
 * the summary alone is enough to start diagnosing. E2E_TIMEOUT_MS caps each
 * script (default 420000) so one hung smoke can't stall the whole run.
 *
 * A preflight checks the rig before the ~10-minute run: server answering,
 * NEXTAUTH_SECRET + CREDENTIALS_KEY set, demo seed present. Any miss used
 * to surface only mid-suite (the mailbox smoke's fast-fail, baffling login
 * 401s); now it fails in the first seconds with the fix spelled out.
 */
import { readdirSync, mkdirSync, createWriteStream, readFileSync } from "node:fs"
import { spawn } from "node:child_process"
import path from "node:path"
import { BASE } from "./e2e-lib.mjs" // side effect: loads .env.local for localhost BASE

const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 420000)
const filters = process.argv.slice(2).map((f) => f.toLowerCase())

const problems = []
try {
  const res = await fetch(`${BASE}/hub/login`)
  if (res.status !== 200)
    problems.push(`${BASE}/hub/login answered ${res.status} — is the right app running there?`)
} catch {
  problems.push(`no server answering at ${BASE} — run: npm run build && npm run start`)
}
if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET)
  problems.push("NEXTAUTH_SECRET (or AUTH_SECRET) unset — every hub login will 401 with MissingSecret")
if (!process.env.CREDENTIALS_KEY)
  problems.push("CREDENTIALS_KEY unset — the mailbox smoke fast-fails on credential saves; set 32+ random chars in .env.local and restart the server")
if (!process.env.CRON_SECRET)
  problems.push("CRON_SECRET unset — the recurring-lane/rollup smokes' cron calls all 401; set it in .env.local and restart the server")
if (!process.env.POSTGRES_URL) {
  problems.push("POSTGRES_URL unset — reseeds and cent-exact checks cannot run")
} else {
  try {
    const { Client } = await import("pg")
    const client = new Client({ connectionString: process.env.POSTGRES_URL })
    await client.connect()
    const seeded = await client.query("SELECT 1 FROM hub.users WHERE email = 'owner@demo.thind' LIMIT 1")
    await client.end()
    if (!seeded.rowCount)
      problems.push("demo seed missing (no owner@demo.thind in hub.users) — run: npm run db:migrate && npm run seed:demo")
  } catch (err) {
    problems.push(`cannot reach Postgres at POSTGRES_URL (${err.message}) — reseeding smokes would all fail`)
  }
}
if (problems.length) {
  console.error("Preflight failed — fix the rig before burning a suite run:")
  for (const p of problems) console.error(`  ❌ ${p}`)
  process.exit(2)
}
console.log(`✅ preflight: server up at ${BASE}, secrets set, demo seed present`)

const scriptsDir = path.dirname(new URL(import.meta.url).pathname)
const scripts = readdirSync(scriptsDir)
  .filter((f) => /^e2e-.*-smoke\.mjs$/.test(f))
  .sort()
  .concat(process.env.SKIP_SWEEP === "1" ? [] : ["e2e-sweep.mjs"])
  .filter((f) => filters.length === 0 || filters.some((needle) => f.includes(needle)))

if (scripts.length === 0) {
  console.error(`no smoke matches ${JSON.stringify(process.argv.slice(2))}`)
  process.exit(2)
}

const LOG_DIR = "e2e-shots-logs"
mkdirSync(LOG_DIR, { recursive: true })

function runOne(script) {
  return new Promise((resolve) => {
    const name = path.basename(script, ".mjs")
    const logPath = path.join(LOG_DIR, `${name}.log`)
    const log = createWriteStream(logPath)
    const child = spawn(process.execPath, [path.join("scripts", script)], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout.pipe(log)
    child.stderr.pipe(log)
    const killer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ name, ok: false, why: `timeout after ${TIMEOUT_MS}ms`, logPath })
    }, TIMEOUT_MS)
    child.on("exit", (code) => {
      clearTimeout(killer)
      resolve({ name, ok: code === 0, why: code === 0 ? "" : `exit ${code}`, logPath })
    })
  })
}

/**
 * Chrome occasionally dies AT LAUNCH on ubuntu-latest runners (register-dump
 * stack trace in ~1s, before any check runs) — seen 2026-08-08 on
 * e2e-notifications-smoke, which then passed unchanged locally. That's a
 * runner crash, not a test result, so it earns exactly one retry. Assertion
 * failures never match this signature and are never retried.
 */
function isBrowserLaunchCrash(logPath) {
  try {
    const text = readFileSync(logPath, "utf-8")
    return /Failed to launch the browser process|pptr\.dev\/troubleshooting/i.test(text)
  } catch {
    return false
  }
}

const started = Date.now()
const results = []
for (const script of scripts) {
  const t0 = Date.now()
  let r = await runOne(script)
  if (!r.ok && isBrowserLaunchCrash(r.logPath)) {
    console.log(`   ↻ ${r.name}: browser crashed at launch — retrying once`)
    r = await runOne(script)
  }
  const secs = Math.round((Date.now() - t0) / 1000)
  console.log(`${r.ok ? "✅ PASS" : "❌ FAIL"} ${r.name} (${secs}s${r.why ? `, ${r.why}` : ""})`)
  if (!r.ok) {
    const tail = readFileSync(r.logPath, "utf-8").trim().split("\n").slice(-12)
    for (const line of tail) console.log(`     ${line}`)
  }
  results.push(r)
}

const failed = results.filter((r) => !r.ok)
const mins = Math.round((Date.now() - started) / 6000) / 10
console.log(`\n${results.length - failed.length}/${results.length} passed in ${mins}m — logs in ${LOG_DIR}/`)
if (failed.length) {
  console.log(`Failed: ${failed.map((r) => r.name).join(", ")}`)
  process.exit(1)
}
