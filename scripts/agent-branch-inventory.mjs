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

let gitFailures = 0

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    gitFailures++
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

function buildInventory({ pendingOnly }) {
  git("fetch origin --quiet")
  gitFailures = 0 // an offline fetch is fine — local refs still answer the inventory
  const branches = listClaudeBranches()
  if (!branches.length) {
    // `git branch -r` returning nothing means git itself is failing (spawn
    // pressure, corrupt clone) — this repo always has claude/* branches.
    // Emitting an empty inventory here is what made agent:status report
    // "0 pending" while hundreds of branches were waiting.
    throw new Error("git branch -r returned no claude/* branches — git is failing, inventory aborted")
  }
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

  if (!rows.length && gitFailures > 0) {
    // Every branch looked "on main" but only because git calls were erroring —
    // an empty inventory built on failed commands must not parse as all-clear.
    throw new Error(`${gitFailures} git command(s) failed while building the inventory — result discarded`)
  }

  rows.sort((a, b) => b.priority - a.priority || (b.tip?.date ?? "").localeCompare(a.tip?.date ?? ""))
  return rows
}

function main() {
  const json = process.argv.includes("--json")
  const showAll = process.argv.includes("--all")
  let rows
  try {
    rows = buildInventory({ pendingOnly: !showAll })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (json) console.log(JSON.stringify({ integrator: INTEGRATOR, main: MAIN, error: message }, null, 2))
    console.error(`agent-branch-inventory: ${message}`)
    process.exitCode = 2
    return
  }

  if (json) {
    // No process.exit() here: exiting right after console.log truncates the
    // ~270KB JSON mid-write when stdout is a pipe (>64KB pipe buffer), which
    // is what randomly fed agent:status half a document. Let node flush.
    console.log(JSON.stringify({ integrator: INTEGRATOR, main: MAIN, pending: rows }, null, 2))
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
