#!/usr/bin/env node
/**
 * Inventory every origin/claude/* branch — find unpicked agent work.
 *
 * Usage:
 *   node scripts/agent-branch-inventory.mjs           # human report
 *   node scripts/agent-branch-inventory.mjs --pending # only branches not fully on main
 *   node scripts/agent-branch-inventory.mjs --json    # machine-readable
 *
 * "Pending" = at least one commit on the branch that is not reachable from origin/main.
 */
import { execSync } from "node:child_process"
import { inferLane } from "./infer-agent-lane.mjs"

const INTEGRATOR = "origin/claude/hauldesk-project-setup-l1luoo"
const MAIN = "origin/main"
const PREFIX = "origin/claude/"

const SKIP_BRANCHES = new Set(["hauldesk-project-setup-l1luoo"])

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

function listClaudeBranches() {
  const out = git("branch -r")
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith(PREFIX))
    .map((l) => l.slice(PREFIX.length))
    .filter((name) => !SKIP_BRANCHES.has(name))
}

function changedFiles(ref, base) {
  const out = git(`diff --name-only ${base}...${ref}`)
  return out ? out.split("\n").filter(Boolean) : []
}

function tip(ref) {
  const hash = git(`log ${ref} -1 --format=%h`)
  const subject = git(`log ${ref} -1 --format=%s`)
  const date = git(`log ${ref} -1 --format=%ci`)
  if (!hash) return null
  return { hash, subject, date }
}

/**
 * Count unpicked commits from `git cherry <upstream> <head>` output.
 * git cherry prefixes: "+" = NOT in upstream (unpicked), "-" = a
 * patch-equivalent commit IS already in upstream (picked). Counting "-"
 * here (the original bug) made the integrator re-merge already-landed
 * branches and hide genuinely new work as "on main".
 */
export function countUnpickedFromCherry(out) {
  return out.split("\n").filter((l) => l.startsWith("+")).length
}

function unpickedCommitCount(ref, base) {
  const out = git(`cherry ${base} ${ref}`)
  if (!out) return revCount(base, ref)
  return countUnpickedFromCherry(out)
}

export function buildInventory({ pendingOnly, fetch = true }) {
  if (fetch) git("fetch origin --quiet")
  const branches = listClaudeBranches()
  const rows = []

  for (const name of branches) {
    const ref = `${PREFIX}${name}`
    if (!git(`rev-parse --verify ${ref}`)) continue

    const aheadMain = revCount(MAIN, ref)
    const aheadIntegrator = revCount(INTEGRATOR, ref)
    const unpickedOnMain = unpickedCommitCount(ref, MAIN)
    const onMain = unpickedOnMain === 0
    const onIntegrator = revCount(INTEGRATOR, ref) === 0 && unpickedCommitCount(ref, INTEGRATOR) === 0

    if (pendingOnly && onMain) continue
    if (aheadMain === 0 && aheadIntegrator === 0 && onMain) continue

    const files = changedFiles(ref, MAIN)
    const lane = inferLane(files.length ? files : changedFiles(ref, INTEGRATOR))
    const t = tip(ref)

    rows.push({
      branch: `claude/${name}`,
      aheadMain,
      aheadIntegrator,
      unpickedOnMain,
      onMain,
      onIntegrator,
      suggestedLane: lane.lane,
      laneLabel: lane.label,
      laneConfidence: lane.confidence,
      files: files.slice(0, 8),
      tip: t,
      priority: unpickedOnMain * 100 + aheadIntegrator,
    })
  }

  rows.sort((a, b) => b.priority - a.priority || (b.tip?.date ?? "").localeCompare(a.tip?.date ?? ""))
  return rows
}

function main() {
  const json = process.argv.includes("--json")
  const showAll = process.argv.includes("--all")
  const rows = buildInventory({ pendingOnly: !showAll })

  if (json) {
    // process.stdout.write + return, NOT process.exit: exiting with a pending
    // async pipe write truncates large JSON mid-stream (consumers then parse
    // a cut-off document — this is how agent:status once reported 0 pending
    // while agent:branches showed hundreds).
    process.stdout.write(JSON.stringify({ integrator: INTEGRATOR, main: MAIN, pending: rows }, null, 2) + "\n")
    return
  }

  console.log("LoadOff agent branch inventory")
  console.log("===============================")
  console.log(`Showing: ${showAll ? "all unmerged claude/* branches" : "pending (commits not on main)"}`)
  console.log(`Integrator: ${INTEGRATOR}`)
  console.log(`Main:       ${MAIN}`)
  console.log("")

  if (!rows.length) {
    console.log("No pending claude/* branches — all agent work is on main.")
    return
  }

  console.log(`${rows.length} branch(es) with unpicked work:\n`)
  for (const r of rows) {
    console.log(`  ${r.branch}`)
    console.log(`    tip: ${r.tip?.hash} ${r.tip?.subject}`)
    console.log(`    ahead of main: ${r.unpickedOnMain} unpicked (${r.aheadMain} raw) · ahead of integrator: ${r.aheadIntegrator}`)
    console.log(`    suggested lane: ${r.suggestedLane} (${r.laneLabel}, ${r.laneConfidence})`)
    if (r.files.length) console.log(`    files: ${r.files.join(", ")}${r.files.length >= 8 ? "…" : ""}`)
    console.log("")
  }

  const top = rows[0]
  console.log("--- INTEGRATOR: merge this branch next ---")
  console.log(`  ${top.branch} — ${top.tip?.subject}`)
  console.log(`  git fetch origin && git checkout claude/hauldesk-project-setup-l1luoo`)
  console.log(`  git merge origin/${top.branch.split("/").slice(1).join("/")}`)
}

// import-safe: only run when executed directly (tests import countUnpickedFromCherry)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
