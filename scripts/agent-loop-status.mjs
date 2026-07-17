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
import { buildInventory } from "./agent-branch-inventory.mjs"

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
 * Mismatch guard: a 0-pending answer must be verifiable, not suspicious.
 * Rows come from buildInventory({ pendingOnly: false }) — when nothing is
 * unpicked but branches are still ahead of main in raw commits, say so
 * explicitly (patch-equivalent history) instead of printing a bare 0.
 */
export function formatPendingSummary(rows) {
  const pending = rows.filter((r) => !r.onMain)
  const lines = [`Pending claude/* branches (not on main): ${pending.length}`]
  if (pending.length > 0) {
    lines.push("  Run: npm run agent:branches")
  } else {
    const patchEquivalent = rows.filter((r) => r.onMain && r.aheadMain > 0)
    if (patchEquivalent.length > 0) {
      lines.push(
        `  Verified 0 unpicked: ${patchEquivalent.length} branch(es) are ahead of main in raw commits but fully patch-equivalent.`
      )
    }
  }
  return lines
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

  // In-process call — the old subprocess + JSON.parse handoff collapsed any
  // failure (maxBuffer overflow, crash output) into a silent pending=0.
  let inventoryRows = null
  let inventoryError = null
  try {
    inventoryRows = buildInventory({ pendingOnly: false, fetch: false })
  } catch (err) {
    inventoryError = err
  }
  console.log("")
  if (!inventoryRows) {
    console.log(`Pending claude/* branches: UNKNOWN — inventory failed: ${inventoryError?.message ?? inventoryError}`)
    console.log("  Do not trust this run's steady-state verdict. Run: npm run agent:branches")
  } else {
    for (const line of formatPendingSummary(inventoryRows)) console.log(line)
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
  if (inventoryError) {
    console.log("INVENTORY FAILED: pending-branch count is unverified — treat this run as inconclusive.")
    process.exit(1)
  }
  console.log(`STEADY STATE: integrator within ${THRESHOLD} commits of main.`)
}

// import-safe: only run when executed directly (tests import formatPendingSummary)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
