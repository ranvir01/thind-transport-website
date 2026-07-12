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
 */
import { readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const LOG_DIR = process.argv[2] ?? "e2e-run-all-logs"
mkdirSync(LOG_DIR, { recursive: true })

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
