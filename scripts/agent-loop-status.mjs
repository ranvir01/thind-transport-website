#!/usr/bin/env node
/**
 * Read-only snapshot of the LoadOff agent loop: branch drift + recent Backlog trailers.
 *
 * Usage:
 *   node scripts/agent-loop-status.mjs
 *   AGENT_CATCHUP_THRESHOLD=3 AGENT_STALL_THRESHOLD_HOURS=24 node scripts/agent-loop-status.mjs
 *
 * Exit 0 = steady state (integrator within threshold of main AND moving).
 * Exit 1 = catch-up mode (integrator ahead of main by more than AGENT_CATCHUP_THRESHOLD).
 * Exit 2 = integrator stalled (no integrator commit for AGENT_STALL_THRESHOLD_HOURS while
 *          claude/* branches wait for pickup — drift-vs-main alone cannot see this).
 */
import { execSync } from "node:child_process"

const INTEGRATOR = "origin/claude/hauldesk-project-setup-l1luoo"
const MAIN = "origin/main"
const THRESHOLD = Number(process.env.AGENT_CATCHUP_THRESHOLD ?? "3")
const STALL_HOURS = Number(process.env.AGENT_STALL_THRESHOLD_HOURS ?? "24")

const LANES = [
  "lane-office",
  "lane-driver",
  "lane-portal",
  "lane-sidecars",
  "lane-tests",
  "lane-compliance",
  "lane-docs",
  "lane-roadmap",
  "lane-integrations",
  "lane-analytics",
  "lane-saas",
]

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return ""
  }
}

function revCount(base, head) {
  const out = git(`rev-list --count ${base}..${head}`)
  return out ? Number(out) : 0
}

function logLines(base, head, limit = 8) {
  const out = git(`log ${base}..${head} --oneline -n ${limit}`)
  return out ? out.split("\n") : []
}

function parseBacklogs(ref, limit = 10) {
  const out = git(`log ${ref} -n ${limit} --format=%B---COMMIT---`)
  const blocks = []
  for (const chunk of out.split("---COMMIT---")) {
    const match = chunk.match(/\nBacklog:\s*\n([\s\S]*?)(?:\n\n|\s*$)/i)
    if (match) {
      const items = match[1]
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean)
      if (items.length) blocks.push(items)
    }
  }
  return blocks
}

function branchExists(name) {
  return git(`rev-parse --verify ${name}`).length > 0
}

/**
 * Parse `agent-branch-inventory.mjs --json` output into a pending count.
 * Throws on truncated/invalid JSON or a missing `pending` array — the
 * caller must surface that as UNKNOWN, never as 0 (a silent 0 once hid
 * 200+ unpicked branches from the integrator).
 */
export function parsePendingCount(raw) {
  const data = JSON.parse(raw)
  if (!Array.isArray(data.pending)) {
    throw new Error("inventory JSON has no 'pending' array — schema mismatch")
  }
  return data.pending.length
}

/**
 * Final loop verdict. Pure so tests can cover every mode.
 *
 * The July 2026 fleet stall taught us drift-vs-main is the wrong staleness
 * signal: the integrator sat 6 days dead at 0 drift (nothing merged, so
 * nothing to drain) while 300+ branches waited, and this script printed
 * STEADY STATE the whole time. A healthy loop needs the integrator to be
 * both close to main AND recently moving whenever work is pending.
 *
 * pendingCount === null means the inventory failed (UNKNOWN) — treated as
 * "work may be waiting", never as 0.
 */
export function assessLoop({ integratorAhead, integratorAgeHours, pendingCount, threshold, stallHours }) {
  if (integratorAhead > threshold) {
    return {
      mode: "CATCH_UP",
      exitCode: 1,
      message: `CATCH-UP MODE: integrator is ${integratorAhead} commits ahead (threshold ${threshold}). Deploy agent should drain integrator → main before new backlog work.`,
    }
  }
  const workMayBeWaiting = pendingCount === null || pendingCount > 0
  if (integratorAgeHours !== null && integratorAgeHours > stallHours && workMayBeWaiting) {
    const waiting = pendingCount === null ? "an UNKNOWN number of" : String(pendingCount)
    return {
      mode: "STALLED",
      exitCode: 2,
      message:
        `INTEGRATOR STALLED: last integrator commit was ${Math.floor(integratorAgeHours)}h ago ` +
        `(threshold ${stallHours}h) with ${waiting} claude/* branch(es) waiting for pickup. ` +
        `Drift vs main is fine, but nothing is being merged — check the :00 integrator automation.`,
    }
  }
  return {
    mode: "STEADY",
    exitCode: 0,
    message: `STEADY STATE: integrator within ${threshold} commits of main and moving.`,
  }
}

function lastCommitAgeHours(ref, nowMs = Date.now()) {
  const out = git(`log -1 --format=%ct ${ref}`)
  if (!out) return null
  return (nowMs - Number(out) * 1000) / 3_600_000
}

function main() {
  git("fetch origin --quiet")

  const integratorAhead = revCount(MAIN, INTEGRATOR)
  const mainAhead = revCount(INTEGRATOR, MAIN)
  const integratorAgeHours = lastCommitAgeHours(INTEGRATOR)

  console.log("LoadOff agent loop status")
  console.log("========================")
  console.log(`Integrator: ${INTEGRATOR}`)
  console.log(`Main:       ${MAIN}`)
  console.log("")
  console.log(`Integrator ahead of main: ${integratorAhead} commit(s)`)
  if (integratorAgeHours !== null) {
    const lastDate = git(`log -1 --format=%ci ${INTEGRATOR}`)
    console.log(`Integrator last commit:   ${lastDate} (${Math.floor(integratorAgeHours)}h ago)`)
  }
  if (mainAhead > 0) {
    console.log(`Main ahead of integrator: ${mainAhead} commit(s) — integrator should rebase/merge main`)
  }

  if (integratorAhead > 0) {
    console.log("\nIntegrator commits not on main:")
    for (const line of logLines(MAIN, INTEGRATOR)) console.log(`  ${line}`)
  }

  let pendingCount = null
  try {
    const pendingOut = execSync("node scripts/agent-branch-inventory.mjs --json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      // 300+ branch rows already exceed 200 KB; leave room to grow well past
      // execSync's 1 MB default so the child is never SIGTERM-truncated.
      maxBuffer: 64 * 1024 * 1024,
    })
    pendingCount = parsePendingCount(pendingOut)
  } catch (err) {
    const reason = String(err?.message ?? err).split("\n")[0]
    console.log(`\nPending claude/* branches (not on main): UNKNOWN — inventory --json failed: ${reason}`)
    console.log("  Do not trust this run's steady-state verdict; run: npm run agent:branches")
  }
  if (pendingCount !== null) {
    console.log(`\nPending claude/* branches (not on main): ${pendingCount}`)
    if (pendingCount > 0) {
      console.log("  Run: npm run agent:branches")
    }
  }

  console.log("\nLane branches ahead of integrator:")
  let anyLane = false
  for (const lane of LANES) {
    const ref = `origin/claude/${lane}`
    if (!branchExists(ref)) continue
    const ahead = revCount(INTEGRATOR, ref)
    if (ahead > 0) {
      anyLane = true
      console.log(`  claude/${lane}: ${ahead} commit(s)`)
      for (const line of logLines(INTEGRATOR, ref, 3)) console.log(`    ${line}`)
    }
  }
  if (!anyLane) console.log("  (none — all merged or empty)")

  const backlogs = parseBacklogs(MAIN, 10)
  console.log("\nRecent Backlog: blocks on main (newest first):")
  if (!backlogs.length) {
    console.log("  (none found in last 10 commits)")
  } else {
    backlogs.slice(0, 3).forEach((items, i) => {
      console.log(`  Block ${i + 1}:`)
      items.slice(0, 5).forEach((item) => console.log(`    - ${item}`))
    })
  }

  console.log("")
  const verdict = assessLoop({
    integratorAhead,
    integratorAgeHours,
    pendingCount,
    threshold: THRESHOLD,
    stallHours: STALL_HOURS,
  })
  console.log(verdict.message)
  if (verdict.exitCode !== 0) process.exit(verdict.exitCode)
}

// import-safe: only run when executed directly (tests import parsePendingCount)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
