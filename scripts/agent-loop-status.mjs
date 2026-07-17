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
 * Parse the inventory --json payload into a pending count. Returns null (not
 * 0) when the payload is empty, truncated, or malformed — "0 pending" and
 * "count unknown" are different answers, and conflating them once hid 200+
 * pending branches behind a truncated pipe write.
 */
export function parsePendingCount(jsonText) {
  if (!jsonText || !jsonText.trim()) return null
  try {
    const parsed = JSON.parse(jsonText)
    return Array.isArray(parsed.pending) ? parsed.pending.length : null
  } catch {
    return null
  }
}

/**
 * Mismatch guard: cross-check the parsed count against a raw ancestry count
 * (`git branch -r --no-merged main`). Raw > parsed is normal — ancestry
 * over-counts stale branches whose content landed via manual merges — but
 * parsed 0/null while the raw count shows work is exactly the silent-failure
 * mode this guards against. Returns a warning string, or null when consistent.
 */
export function pendingMismatchWarning(parsedCount, rawUnmergedCount) {
  if (parsedCount === null) {
    return `WARNING: branch inventory output could not be parsed — pending count unknown (${rawUnmergedCount} claude/* branch(es) not ancestry-merged into main). Run: npm run agent:branches`
  }
  if (parsedCount === 0 && rawUnmergedCount > 0) {
    return `WARNING: inventory reports 0 pending but ${rawUnmergedCount} claude/* branch(es) are not ancestry-merged into main — inventory may be broken. Run: npm run agent:branches`
  }
  return null
}

function countUnmergedClaudeBranches() {
  const out = git(`branch -r --no-merged ${MAIN}`)
  if (!out) return 0
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

  let pendingOut = ""
  try {
    pendingOut = execSync("node scripts/agent-branch-inventory.mjs --json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch {
    pendingOut = ""
  }
  const pendingCount = parsePendingCount(pendingOut)
  const mismatch = pendingMismatchWarning(pendingCount, countUnmergedClaudeBranches())
  console.log(`\nPending claude/* branches (not on main): ${pendingCount ?? "unknown"}`)
  if (mismatch) {
    console.log(`  ${mismatch}`)
  } else if (pendingCount > 0) {
    console.log("  Run: npm run agent:branches")
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

// import-safe: only run when executed directly (tests import the parse/guard helpers)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
