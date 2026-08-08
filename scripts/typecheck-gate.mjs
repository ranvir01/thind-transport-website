/**
 * typecheck-gate.mjs — make `tsc --noEmit` enforceable today.
 *
 * The situation this solves: vitest.config.ts transpiles with esbuild and
 * never typechecks, so the test suite is not type-sound. There are 105 tsc
 * diagnostics across ~30 test files and ZERO in application code.
 *
 * Two obvious moves are both wrong. Gating CI on a clean `tsc --noEmit` turns
 * the build red on day one for debt nobody is fixing this hour. Doing nothing
 * lets the debt spread from tests into `src/` where it actually costs
 * correctness.
 *
 * So: two gates.
 *
 *   1. APPLICATION CODE MUST BE CLEAN. Any tsc error in a non-test file fails
 *      the build, immediately, no baseline. This is the gate that matters and
 *      it passes today.
 *
 *   2. TEST DEBT RATCHETS DOWN ONLY. Test-file errors are compared against the
 *      recorded baseline below. Fewer is fine (and prints a nudge to lower the
 *      baseline). More fails. The count can never grow back.
 *
 * When the test count reaches zero, delete this script and gate on plain
 * `npm run typecheck`.
 *
 * USAGE
 *   node scripts/typecheck-gate.mjs            # both gates
 *   node scripts/typecheck-gate.mjs --list     # show the current offenders
 */
import { execSync } from "node:child_process"
import { pathToFileURL } from "node:url"

/**
 * Test-file tsc errors as of 2026-07-28. Lower this whenever you fix some;
 * never raise it. Raising it is how a ratchet stops being a ratchet.
 *
 * History: 105 → 86 → 78. The drop to 86 came from two shared fixtures rather
 * than per-file patches — helpers/db-mock.ts (a `vi.fn(async () => [])`
 * declares a ZERO-argument function, so every `const [sql, params] =
 * mock.calls[0]` was a type error) and helpers/session.ts (hand-built session
 * objects all omitted HubSessionUser's required `email`). Use those in new
 * tests and this number keeps falling on its own. The drop to 78 fixed the
 * same shape of bug ad hoc in four files that don't use those shared
 * fixtures: vin.test.ts/weather.test.ts/eia-diesel-price.test.ts each stub
 * `fetch` with a zero-argument `vi.fn(async () => ...)` then read
 * `mock.calls[0][0]`, and dvir-tenancy.test.ts's local `makeClient()` mock
 * took only `(text: string)` while its assertions read `mock.calls[n][1]` for
 * query params — same fix as the shared fixtures, just inline: give the mock
 * a second parameter. The drop to 52 merged two independent integrator
 * ratchet chains (onboarding-workspace/sidecars/prod-smoke-staleness fixes)
 * that had been sitting fixed-but-undrained on separate branches. The drop to
 * 42 absorbed claude/lane-tests' notify-tenancy/credentials/customer-
 * statements fixes (same zero-arg-mock and optional-params-tuple shapes) on
 * top of that. The drop to 36 → 35 came from the large 2026-07-29 branch-
 * absorb cycle: merging ~150 pending claude/* branches incidentally picked
 * up a handful of small test-file type fixes bundled with their real changes.
 */
const TEST_ERROR_BASELINE = 23

const isTestFile = (file) =>
  file.includes("__tests__/") || file.endsWith(".test.ts") || file.endsWith(".test.tsx")

function runTsc() {
  try {
    execSync("npx tsc --noEmit", { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] })
    return ""
  } catch (err) {
    // tsc exits non-zero when it finds anything; the diagnostics are on stdout.
    return `${err.stdout ?? ""}${err.stderr ?? ""}`
  }
}

/**
 * Parse `tsc --noEmit` output into diagnostics. Exported so the path handling
 * is testable without shelling out to tsc — the regex silently dropping a
 * whole route group is exactly the failure a unit test catches and a
 * green-looking gate does not.
 */
export function parseDiagnostics(output) {
  return output
    .split("\n")
    // Greedy `.+`, not `[^(]+`: Next.js route groups are literal parentheses in
  // the path (src/app/hub/(office)/...), and a class that excluded "(" failed
    // to match those lines at all — so 76 of the app's 807 source files, the
    // whole office route group, were counted as neither app nor test errors and
    // silently passed a gate whose entire job is "application code must be
    // clean". Greedy backtracks to the LAST (line,col): pair, which is the real
    // delimiter.
    .map((line) => line.match(/^(src\/.+)\((\d+),(\d+)\):\s*(error\s+TS\d+:.*)$/))
    .filter(Boolean)
    .map((m) => ({ file: m[1], line: Number(m[2]), message: m[4] }))
}

export const isTestDiagnostic = (file) => isTestFile(file)

/**
 * Everything below is the CLI. Guarded so that importing this module — which
 * the parser test does — neither shells out to tsc nor calls process.exit.
 */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
const output = runTsc()
const diagnostics = parseDiagnostics(output)

const appErrors = diagnostics.filter((d) => !isTestFile(d.file))
const testErrors = diagnostics.filter((d) => isTestFile(d.file))

if (process.argv.includes("--list")) {
  const byFile = new Map()
  for (const d of testErrors) byFile.set(d.file, (byFile.get(d.file) ?? 0) + 1)
  console.log("\nTest files with tsc errors, worst first:\n")
  for (const [file, n] of [...byFile].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${file}`)
  }
  console.log("")
}

console.log(`\n🔎 typecheck gate`)
console.log(`   application code: ${appErrors.length} error(s)`)
console.log(`   test files:       ${testErrors.length} error(s)  (baseline ${TEST_ERROR_BASELINE})\n`)

let failed = false

if (appErrors.length > 0) {
  console.log(`❌ ${appErrors.length} type error(s) in application code. These are never acceptable:\n`)
  for (const d of appErrors.slice(0, 25)) console.log(`   ${d.file}:${d.line} — ${d.message}`)
  if (appErrors.length > 25) console.log(`   …and ${appErrors.length - 25} more`)
  console.log("")
  failed = true
}

if (testErrors.length > TEST_ERROR_BASELINE) {
  console.log(
    `❌ Test-file type errors went UP: ${testErrors.length} vs a baseline of ${TEST_ERROR_BASELINE}.`
  )
  console.log(`   Fix the new ones. Run with --list to see where they are.`)
  console.log(`   Do not raise TEST_ERROR_BASELINE — the point of a ratchet is that it only turns one way.\n`)
  failed = true
} else if (testErrors.length < TEST_ERROR_BASELINE) {
  console.log(
    `✅ Test-file errors are down to ${testErrors.length} (baseline ${TEST_ERROR_BASELINE}). ` +
      `Lower TEST_ERROR_BASELINE in this file to lock the gain in.\n`
  )
}

if (failed) process.exit(1)
console.log("✅ typecheck gate passed.\n")
}
