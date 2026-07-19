/**
 * Run the full e2e smoke battery sequentially and print one summary table.
 *
 * Every QA rig run so far has hand-rolled the same bash loop over
 * scripts/e2e-*-smoke.mjs; this makes that loop a first-class, reproducible
 * command with per-script logs and a machine-quotable "N/M PASS" verdict.
 *
 *   node scripts/e2e-battery.mjs                 # all smokes + e2e-sweep
 *   node scripts/e2e-battery.mjs invoices fuel   # only smokes matching a term
 *   E2E_BATTERY_TIMEOUT_MS=600000 node scripts/e2e-battery.mjs
 *
 * Prerequisites are the same as any single smoke (see e2e-lib.mjs): server
 * running against a seeded database. Smokes run SEQUENTIALLY on purpose —
 * state-consuming smokes reseed the shared database, so parallel runs poison
 * each other. Logs land in e2e-shots-battery/ (covered by the existing
 * "e2e-shots*" gitignore pattern). Exits non-zero if any script fails.
 */
import { readdirSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const TIMEOUT_MS = Number(process.env.E2E_BATTERY_TIMEOUT_MS ?? 300_000)
const OUT = "e2e-shots-battery"
mkdirSync(OUT, { recursive: true })

const filters = process.argv.slice(2).map((f) => f.toLowerCase())
const smokes = readdirSync("scripts")
  .filter((f) => /^e2e-.*-smoke\.mjs$/.test(f))
  .sort()
// The visual sweep is not a -smoke script but belongs in the full battery.
if (filters.length === 0) smokes.push("e2e-sweep.mjs")

const selected = filters.length
  ? smokes.filter((f) => filters.some((term) => f.includes(term)))
  : smokes

if (selected.length === 0) {
  console.error(`No smoke matches ${JSON.stringify(process.argv.slice(2))}`)
  process.exit(2)
}

const results = []
for (const [i, file] of selected.entries()) {
  const label = file.replace(/^e2e-|\.mjs$/g, "")
  process.stdout.write(`[${i + 1}/${selected.length}] ${label} … `)
  const started = Date.now()
  const run = spawnSync(process.execPath, [path.join("scripts", file)], {
    timeout: TIMEOUT_MS,
    encoding: "utf-8",
    env: process.env,
  })
  const seconds = ((Date.now() - started) / 1000).toFixed(0)
  const timedOut = run.error?.code === "ETIMEDOUT"
  const ok = !timedOut && run.status === 0
  writeFileSync(path.join(OUT, `${label}.log`), (run.stdout ?? "") + (run.stderr ?? ""))
  console.log(`${ok ? "✅" : timedOut ? "⏱ TIMEOUT" : "❌ FAIL"} (${seconds}s)`)
  results.push({ label, ok, seconds, timedOut })
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
for (const r of failed) {
  console.log(`  ❌ ${r.label}${r.timedOut ? " (timed out)" : ""} — see ${OUT}/${r.label}.log`)
}
process.exit(failed.length === 0 ? 0 : 1)
