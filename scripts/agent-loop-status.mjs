#!/usr/bin/env node
/**
 * Read-only snapshot of the LoadOff agent loop: branch drift + recent Backlog trailers.
 *
 * Usage:
 *   node scripts/agent-loop-status.mjs
 *   AGENT_CATCHUP_THRESHOLD=3 node scripts/agent-loop-status.mjs
 *
 * Exit 0 = integrator is within threshold of main (steady state OK).
 * Exit 1 = integrator is ahead of main by more than AGENT_CATCHUP_THRESHOLD (catch-up mode),
 *          or the pending-branch inventory failed / disagrees with git (status unknown).
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
 * Interpret the inventory's --json output. Never collapses failure into a
 * pending count of 0 — that made agent:status report "0 pending" while
 * agent:branches listed hundreds (the inventory child had errored or emitted
 * an empty result under transient git failures).
 */
export function parsePendingInventory(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const snippet = String(raw).slice(0, 120).replace(/\s+/g, " ").trim() || "(empty output)"
    return { pendingCount: null, error: `inventory output was not valid JSON: ${snippet}` }
  }
  if (parsed && typeof parsed.error === "string") return { pendingCount: null, error: parsed.error }
  if (!parsed || !Array.isArray(parsed.pending)) {
    return { pendingCount: null, error: "inventory JSON has no pending[] array" }
  }
  return { pendingCount: parsed.pending.length, error: null }
}

/** Cheap independent lower-bound: claude/* branches whose tip is not an ancestor of main. */
export function countUnmergedClaudeBranches(branchROutput, skip = ["claude/hauldesk-project-setup-l1luoo"]) {
  return branchROutput
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("origin/claude/"))
    .map((l) => l.slice("origin/".length))
    .filter((name) => !skip.includes(name)).length
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

  let inventory
  try {
    const pendingOut = execSync("node scripts/agent-branch-inventory.mjs --json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 64 * 1024 * 1024,
    })
    inventory = parsePendingInventory(pendingOut)
  } catch (err) {
    // A non-zero child exit throws, but the child still prints its error JSON
    // to stdout — recover that reason before falling back to the exec message.
    const fromStdout = err?.stdout ? parsePendingInventory(err.stdout) : null
    inventory =
      fromStdout?.error && !fromStdout.error.startsWith("inventory output was not valid JSON")
        ? fromStdout
        : { pendingCount: null, error: `inventory child failed: ${err instanceof Error ? err.message.split("\n")[0] : err}` }
  }

  let inventoryUnreliable = false
  if (inventory.error) {
    inventoryUnreliable = true
    console.log(`\nPending claude/* branches (not on main): UNKNOWN — ${inventory.error}`)
    console.log("  Run: npm run agent:branches")
  } else {
    console.log(`\nPending claude/* branches (not on main): ${inventory.pendingCount}`)
    if (inventory.pendingCount > 0) {
      console.log("  Run: npm run agent:branches")
    } else {
      // Mismatch guard: "0 pending" must survive a cross-check against git
      // itself. Unmerged-but-patch-equivalent branches can legitimately differ,
      // but 0 pending with many unmerged branches means the inventory lied.
      const unmerged = countUnmergedClaudeBranches(git(`branch -r --no-merged ${MAIN}`))
      if (unmerged > 0) {
        inventoryUnreliable = true
        console.log(
          `  MISMATCH: inventory says 0 pending but git lists ${unmerged} unmerged claude/* branch(es) — inventory likely failed; verify with npm run agent:branches`
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
  if (inventoryUnreliable) {
    console.log("STATUS UNKNOWN: pending-branch inventory failed or disagrees with git — do not trust the pending count above.")
    process.exit(1)
  }
  console.log(`STEADY STATE: integrator within ${THRESHOLD} commits of main.`)
}

// import-safe: only run when executed directly (tests import the parse helpers)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
