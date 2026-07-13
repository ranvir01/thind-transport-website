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
 *   node scripts/e2e-run-all.mjs [logDir]     # default: e2e-run-all-logs
 *   SKIP_SWEEP=1 node scripts/e2e-run-all.mjs # smokes only
 *
 * Per-script output goes to <logDir>/<script>.log; on failure the last
 * lines are echoed so the summary alone is enough to start diagnosing.
 *
 * A preflight checks the rig before the ~10-minute run: server answering,
 * NEXTAUTH_SECRET + CREDENTIALS_KEY set, demo seed present. Any miss used
 * to surface only mid-suite (the mailbox smoke's fast-fail, baffling login
 * 401s); now it fails in the first seconds with the fix spelled out.
 */
import { readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { BASE } from "./e2e-lib.mjs" // side effect: loads .env.local for localhost BASE

const LOG_DIR = process.argv[2] ?? "e2e-run-all-logs"
mkdirSync(LOG_DIR, { recursive: true })

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
const smokes = readdirSync(scriptsDir)
  .filter((f) => /^e2e-.*-smoke\.mjs$/.test(f))
  .sort()

const jobs = smokes.map((f) => ["node", [path.join("scripts", f)], f.replace(/\.mjs$/, "")])
if (process.env.SKIP_SWEEP !== "1") {
  jobs.push(["node", [path.join("scripts", "e2e-sweep.mjs"), path.join(LOG_DIR, "sweep")], "e2e-sweep"])
}

const results = []
for (const [cmd, args, name] of jobs) {
  const started = Date.now()
  const run = spawnSync(cmd, args, { encoding: "utf-8" })
  const seconds = ((Date.now() - started) / 1000).toFixed(0)
  const logPath = path.join(LOG_DIR, `${name}.log`)
  writeFileSync(logPath, (run.stdout ?? "") + (run.stderr ?? ""))
  const pass = run.status === 0
  results.push({ name, pass, seconds, logPath })
  console.log(`${pass ? "✅" : "❌"} ${name} (${seconds}s)`)
  if (!pass) {
    const tail = readFileSync(logPath, "utf-8").trim().split("\n").slice(-12)
    for (const line of tail) console.log(`     ${line}`)
  }
}

const failed = results.filter((r) => !r.pass)
console.log("")
console.log(`${results.length - failed.length}/${results.length} passed — logs in ${LOG_DIR}/`)
if (failed.length) {
  console.log(`Failed: ${failed.map((r) => r.name).join(", ")}`)
  process.exit(1)
}
