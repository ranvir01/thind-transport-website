/**
 * Run every scripts/e2e-*-smoke.mjs sequentially and print a PASS/FAIL table.
 *
 * Every QA rig drive so far has hand-rolled this loop in bash; this makes the
 * whole-suite drive a one-liner and gives the fleet one canonical exit code.
 * Sequential on purpose: the state-consuming smokes reseed the demo database
 * themselves, so parallel runs would fight over the same rows.
 *
 * Prereqs are the same as any single smoke (see e2e-lib.mjs header): server
 * running against a migrated + seeded Postgres. The mailbox-oauth smoke also
 * needs CREDENTIALS_KEY in the server env — it fail-fasts with instructions
 * when missing.
 *
 * Usage:
 *   node scripts/e2e-run-all.mjs                 # all smokes
 *   node scripts/e2e-run-all.mjs fuel ifta       # only smokes whose name matches
 *   node scripts/e2e-run-all.mjs --skip mailbox  # all but matching smokes
 *   E2E_SMOKE_TIMEOUT_MS=600000 node scripts/e2e-run-all.mjs
 *
 * Per-smoke output goes to e2e-run-all-logs/<smoke>.log; the table and exit
 * code (0 = all green) are the summary. A smoke that exceeds the timeout
 * (default 420s) is killed and reported as TIMEOUT.
 */
import { globSync } from "node:fs"
import { mkdirSync, createWriteStream } from "node:fs"
import { spawn } from "node:child_process"
import path from "node:path"

const TIMEOUT_MS = Number(process.env.E2E_SMOKE_TIMEOUT_MS ?? 420_000)
const LOG_DIR = "e2e-run-all-logs"
mkdirSync(LOG_DIR, { recursive: true })

const args = process.argv.slice(2)
const skipIdx = args.indexOf("--skip")
const skips = skipIdx === -1 ? [] : args.slice(skipIdx + 1)
const includes = skipIdx === -1 ? args : args.slice(0, skipIdx)

let smokes = globSync("scripts/e2e-*-smoke.mjs").sort()
if (includes.length) smokes = smokes.filter((f) => includes.some((p) => f.includes(p)))
if (skips.length) smokes = smokes.filter((f) => !skips.some((p) => f.includes(p)))
if (!smokes.length) {
  console.error("No smokes match the given filters.")
  process.exit(2)
}

/** Run one smoke; resolve to "PASS" | "FAIL" | "TIMEOUT". */
function runSmoke(file, logPath) {
  return new Promise((resolve) => {
    const log = createWriteStream(logPath)
    const child = spawn(process.execPath, [file], { stdio: ["ignore", "pipe", "pipe"] })
    child.stdout.pipe(log)
    child.stderr.pipe(log)
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve("TIMEOUT")
    }, TIMEOUT_MS)
    child.on("exit", (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? "PASS" : "FAIL")
    })
  })
}

const results = []
for (const file of smokes) {
  const name = path.basename(file, ".mjs")
  process.stdout.write(`▶ ${name} ... `)
  const started = Date.now()
  const status = await runSmoke(file, path.join(LOG_DIR, `${name}.log`))
  const secs = ((Date.now() - started) / 1000).toFixed(0)
  console.log(`${status} (${secs}s)`)
  results.push({ name, status, secs })
}

const failed = results.filter((r) => r.status !== "PASS")
console.log(`\n${results.length - failed.length}/${results.length} smokes green`)
for (const r of failed) console.log(`  ${r.status} ${r.name} — see ${LOG_DIR}/${r.name}.log`)
process.exit(failed.length ? 1 : 0)
