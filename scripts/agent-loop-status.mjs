#!/usr/bin/env node
/**
 * Read-only snapshot of the LoadOff agent loop: branch drift + recent Backlog trailers.
 *
 * Usage:
 *   node scripts/agent-loop-status.mjs
 *   AGENT_CATCHUP_THRESHOLD=3 node scripts/agent-loop-status.mjs
 *
 * Exit 0 = integrator is within threshold of main (steady state OK).
 * Exit 1 = integrator is ahead of main by more than AGENT_CATCHUP_THRESHOLD (catch-up mode).
 */
import { execSync } from "node:child_process"

const INTEGRATOR = "origin/claude/hauldesk-project-setup-l1luoo"
const MAIN = "origin/main"
const THRESHOLD = Number(process.env.AGENT_CATCHUP_THRESHOLD ?? "3")

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
 * Parse the inventory's --json output into a pending count.
 * Returns a number, or null when the payload is unreadable (truncated pipe,
 * crash mid-write, wrong shape). Callers must treat null as "unknown", never
 * as 0 — the old swallow-to-zero catch hid a truncated 267KB payload and
 * reported "0 pending" while 200+ branches waited.
 */
export function parsePendingCount(jsonText) {
  try {
    const pending = JSON.parse(jsonText).pending
    return Array.isArray(pending) ? pending.length : null
  } catch {
    return null
  }
}

/** Cheap cross-check: origin/claude/* branches whose tip isn't on main. */
function unmergedClaudeBranchCount() {
  const out = git(`branch -r --no-merged ${MAIN}`)
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("origin/claude/") && l !== INTEGRATOR).length
}

function main() {
  git("fetch origin --quiet")

  const integratorAhead = revCount(MAIN, INTEGRATOR)
  const mainAhead = revCount(INTEGRATOR, MAIN)

  console.log("LoadOff agent loop status")
  console.log("========================")
  console.log(`Integrator: ${INTEGRATOR}`)
  console.log(`Main:       ${MAIN}`)
  console.log("")
  console.log(`Integrator ahead of main: ${integratorAhead} commit(s)`)
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
      maxBuffer: 64 * 1024 * 1024,
    })
    pendingCount = parsePendingCount(pendingOut)
  } catch {
    pendingCount = null
  }

  const unmergedTips = unmergedClaudeBranchCount()
  if (pendingCount === null) {
    console.log(`\nPending claude/* branches (not on main): UNKNOWN — inventory --json output was unreadable.`)
    console.log("  Run directly: npm run agent:branches")
  } else if (pendingCount === 0 && unmergedTips > 0) {
    console.log(`\nPending claude/* branches (not on main): 0 — MISMATCH: ${unmergedTips} claude/* tip(s) not merged to main.`)
    console.log("  The inventory disagrees with git branch --no-merged; trust: npm run agent:branches")
  } else {
    console.log(`\nPending claude/* branches (not on main): ${pendingCount}`)
    if (pendingCount > 0) console.log("  Run: npm run agent:branches")
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
  if (integratorAhead > THRESHOLD) {
    console.log(
      `CATCH-UP MODE: integrator is ${integratorAhead} commits ahead (threshold ${THRESHOLD}). Deploy agent should drain integrator → main before new backlog work.`
    )
    process.exit(1)
  }
  console.log(`STEADY STATE: integrator within ${THRESHOLD} commits of main.`)
}

// import-safe: only run when executed directly (tests import parsePendingCount)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
