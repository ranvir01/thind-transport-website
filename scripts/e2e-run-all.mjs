/**
 * Aggregate runner for the scripts/e2e-*-smoke.mjs suite (+ e2e-sweep.mjs).
 * Every QA rig drive was hand-rolling this same loop; now it's one command:
 *
 *   node scripts/e2e-run-all.mjs [filter ...]
 *
 * Runs each smoke sequentially (they share the seeded DB and reseed() as
 * needed — parallel runs would fight over state), streams a one-line verdict
 * per script, and exits non-zero if any failed. Optional filter args keep
 * only smokes whose name contains any of them:
 *
 *   node scripts/e2e-run-all.mjs driver dvir     # just the driver-side pair
 *
 * Per-script output lands in e2e-shots-logs/<name>.log (covered by the
 * "e2e-shots*" gitignore entry), so a failing smoke's trace survives the
 * run. Env knobs are
 * the same as the individual smokes (E2E_BASE_URL, NEXTAUTH_SECRET, …);
 * E2E_TIMEOUT_MS caps each script (default 420000).
 */
import { readdirSync, mkdirSync, createWriteStream } from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 420000)
const filters = process.argv.slice(2).map((f) => f.toLowerCase())

const scripts = readdirSync("scripts")
  .filter((f) => /^e2e-.*-smoke\.mjs$/.test(f))
  .sort()
  .concat("e2e-sweep.mjs")
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
    const log = createWriteStream(path.join(LOG_DIR, `${name}.log`))
    const child = spawn(process.execPath, [path.join("scripts", script)], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout.pipe(log)
    child.stderr.pipe(log)
    const killer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ name, ok: false, why: `timeout after ${TIMEOUT_MS}ms` })
    }, TIMEOUT_MS)
    child.on("exit", (code) => {
      clearTimeout(killer)
      resolve({ name, ok: code === 0, why: code === 0 ? "" : `exit ${code}` })
    })
  })
}

const started = Date.now()
const results = []
for (const script of scripts) {
  const t0 = Date.now()
  const r = await runOne(script)
  const secs = Math.round((Date.now() - t0) / 1000)
  console.log(`${r.ok ? "✅ PASS" : "❌ FAIL"} ${r.name} (${secs}s${r.why ? `, ${r.why}` : ""})`)
  results.push(r)
}

const failed = results.filter((r) => !r.ok)
const mins = Math.round((Date.now() - started) / 6000) / 10
console.log(`\n${results.length - failed.length}/${results.length} passed in ${mins}m`)
if (failed.length) {
  console.log(`failing logs: ${failed.map((r) => `${LOG_DIR}/${r.name}.log`).join(" ")}`)
  process.exit(1)
}
