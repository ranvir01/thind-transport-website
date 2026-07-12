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
 * Exit 2 = pending-branch count is unknown or contradicts the raw git state (fix tooling first).
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
 * Parse `agent-branch-inventory.mjs --json` output into a pending count.
 * Returns { count } on success, { error } on anything else — the caller must
 * surface the error, never coerce it to 0 (a silent 0 hid 200+ pending
 * branches when the inventory's piped stdout was truncated at 64 KiB).
 */
export function parsePendingCount(out) {
  if (!out || !out.trim()) return { error: "inventory produced no output" }
  let parsed
  try {
    parsed = JSON.parse(out)
  } catch {
    return { error: `inventory JSON unparseable (${out.length} bytes — truncated output?)` }
  }
  if (!Array.isArray(parsed.pending)) return { error: "inventory JSON has no pending[] array" }
  return { count: parsed.pending.length }
}

/**
 * Mismatch guard: one cheap git call that counts commits reachable from any
 * origin/claude/* branch but not from main. If this is non-zero while the
 * inventory says 0 pending, the inventory is likely lying (the raw count can
 * legitimately exceed the cherry-based pending count, but not the reverse
 * direction — pending 0 with thousands of unmerged commits is a red flag).
 */
function rawUnmergedClaudeCommits() {
  const refs = git("branch -r")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("origin/claude/") && l !== INTEGRATOR)
  if (!refs.length) return 0
  const out = git(`rev-list --count ^${MAIN} ${refs.join(" ")}`)
  return out ? Number(out) : 0
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
  let inventoryError = null
  try {
    pendingOut = execSync("node scripts/agent-branch-inventory.mjs --json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (err) {
    inventoryError = `inventory subprocess failed: ${err.message}`
  }
  const pending = inventoryError ? { error: inventoryError } : parsePendingCount(pendingOut)
  if (pending.error) {
    console.log(`\nPending claude/* branches (not on main): UNKNOWN — ${pending.error}`)
    console.log("  Fix the inventory, then re-run: npm run agent:status")
    process.exit(2)
  }
  console.log(`\nPending claude/* branches (not on main): ${pending.count}`)
  if (pending.count > 0) {
    console.log("  Run: npm run agent:branches")
  } else {
    const rawUnmerged = rawUnmergedClaudeCommits()
    if (rawUnmerged > 0) {
      console.log(
        `  MISMATCH: inventory says 0 pending but ${rawUnmerged} commit(s) on claude/* branches are not on main — inspect with npm run agent:branches -- --all`
      )
      process.exit(2)
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
