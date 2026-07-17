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
 * Parse `agent-branch-inventory --json` stdout into a pending count.
 * Returns { count } on success, { error } otherwise — callers must never
 * collapse a failure to 0 (that once hid 217 pending branches as "0").
 */
export function parsePendingCount(stdout) {
  let parsed
  try {
    parsed = JSON.parse(stdout)
  } catch (err) {
    return { error: `inventory output is not valid JSON (${err.message})` }
  }
  if (!parsed || !Array.isArray(parsed.pending)) {
    return { error: "inventory JSON has no pending[] array" }
  }
  return { count: parsed.pending.length }
}

/**
 * Cheap independent signal for the mismatch guard: claude/* branches whose
 * tip is not an ancestor of main, in a single git call. Counts raw-unmerged
 * (no patch-equivalence), so it can exceed the inventory's pending count —
 * but it can never be positive while the true pending count is 0 unless
 * every unmerged branch is fully patch-equivalent to main.
 */
function rawUnmergedClaudeBranchCount() {
  const out = git(`for-each-ref --no-merged=${MAIN} --format=%(refname:short) 'refs/remotes/origin/claude/*'`)
  return out
    .split("\n")
    .filter(Boolean)
    .filter((name) => name !== INTEGRATOR).length
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

  let pending
  try {
    const pendingOut = execSync("node scripts/agent-branch-inventory.mjs --json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 64 * 1024 * 1024, // pending JSON is ~1KB/branch; default 1MB throws past ~1000 branches
    })
    pending = parsePendingCount(pendingOut)
  } catch (err) {
    pending = { error: `inventory run failed (${String(err.message ?? err).split("\n")[0]})` }
  }

  if (pending.error) {
    console.log(`\nPending claude/* branches (not on main): UNKNOWN — ${pending.error}`)
    console.log("  Do not trust this status until scripts/agent-branch-inventory.mjs --json runs clean.")
  } else {
    console.log(`\nPending claude/* branches (not on main): ${pending.count}`)
    if (pending.count > 0) {
      console.log("  Run: npm run agent:branches")
    } else {
      const rawUnmerged = rawUnmergedClaudeBranchCount()
      if (rawUnmerged > 0) {
        console.log(
          `  MISMATCH: inventory says 0 pending, but ${rawUnmerged} claude/* branch(es) are not merged into main. ` +
            "Unless all are patch-equivalent to main, the inventory is wrong — run npm run agent:branches to verify."
        )
      }
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
