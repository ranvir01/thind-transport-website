/**
 * branch-triage.mjs — classify every remote branch by whether deleting it
 * would lose anything, and emit the deletion commands for the ones that
 * provably would not.
 *
 * WHY THIS EXISTS. ~25 scheduled agents each push a session branch, and none
 * of them clean up. The repo has drifted past 300 remote branches, which makes
 * `git branch -r` useless and hides the handful of branches that actually
 * carry unlanded work. But "delete the old ones" is the wrong rule: some old
 * branches hold fixes that were never absorbed, and some brand-new ones are
 * already fully merged.
 *
 * The right question is not age, it is: does this branch add anything to main?
 *
 * THREE BUCKETS
 *   merged     — zero commits not already in main. Deleting loses nothing,
 *                by definition.
 *   identical  — has its own commits, but `git diff main...branch` is EMPTY.
 *                This is the common case for agent branches whose work was
 *                cherry-picked or absorbed by content rather than merged.
 *                Deleting loses nothing.
 *   unique     — genuinely adds changes main does not have. NEVER auto-listed
 *                for deletion. Reviewed by a human, or left alone.
 *
 * NEVER TOUCHED, regardless of bucket:
 *   main, the integrator branch, and every `claude/lane-*` branch — those are
 *   the standing territory branches the scheduled agents push to. They are
 *   normally "fully merged" (the integrator just absorbed them), and deleting
 *   one would break the automation that is mid-cycle against it.
 *
 * USAGE
 *   node scripts/branch-triage.mjs             # report only
 *   node scripts/branch-triage.mjs --commands  # + the git push --delete lines
 *   node scripts/branch-triage.mjs --json
 *
 * This script never deletes anything itself. It prints commands for a human to
 * run, because ref deletion is irreversible and the sandbox agents run in
 * cannot do it anyway (the git proxy answers 403 on ref deletion).
 */
import { execSync } from "node:child_process"

const PROTECTED = [
  /^main$/,
  /^claude\/hauldesk-project-setup-l1luoo$/,
  /^claude\/lane-/, // standing territory branches — active automation
]

const sh = (cmd) => execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim()

function remoteBranches() {
  return sh("git branch -r")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("HEAD"))
    .map((line) => line.replace(/^origin\//, ""))
}

function classify(branch) {
  const unique = Number(sh(`git rev-list --count "origin/${branch}" ^origin/main`))
  if (unique === 0) return { branch, bucket: "merged", unique, files: 0 }

  // Three-dot: what this branch ADDS relative to the merge base, not what it
  // is merely behind on. A branch that is only stale shows no files here.
  const files = sh(`git diff --name-only origin/main..."origin/${branch}"`)
    .split("\n")
    .filter(Boolean)
  if (files.length === 0) return { branch, bucket: "identical", unique, files: 0 }
  return { branch, bucket: "unique", unique, files: files.length }
}

const results = []
for (const branch of remoteBranches()) {
  if (PROTECTED.some((re) => re.test(branch))) continue
  try {
    results.push(classify(branch))
  } catch {
    // A ref that vanished mid-run (another agent pruned it) is not an error.
  }
}

const merged = results.filter((r) => r.bucket === "merged")
const identical = results.filter((r) => r.bucket === "identical")
const unique = results.filter((r) => r.bucket === "unique")
const safe = [...merged, ...identical]

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ merged, identical, unique }, null, 2))
} else {
  console.log(`\n🌿 branch triage — ${results.length} branches examined (protected ones skipped)\n`)
  console.log(`  ${String(merged.length).padStart(4)}  fully merged into main      → safe to delete`)
  console.log(`  ${String(identical.length).padStart(4)}  no diff against main        → safe to delete`)
  console.log(`  ${String(unique.length).padStart(4)}  carry changes main lacks    → REVIEW, do not bulk-delete\n`)
  console.log(`  ${safe.length} branches can be deleted with zero loss.\n`)

  if (unique.length > 0) {
    console.log("Largest branches carrying unlanded changes (review these before any purge):")
    for (const r of [...unique].sort((a, b) => b.files - a.files).slice(0, 10)) {
      console.log(`   ${r.branch.padEnd(46)} ${String(r.files).padStart(4)} files, ${r.unique} commits`)
    }
    console.log("")
  }

  if (process.argv.includes("--commands")) {
    console.log("# Verified safe — every one of these adds nothing to main.")
    console.log("# Run from a clone with push rights (agent sandboxes get 403 on ref deletion).")
    for (const chunk of chunked(safe.map((r) => r.branch), 20)) {
      console.log(`git push origin --delete ${chunk.join(" ")}`)
    }
    console.log("\ngit fetch origin --prune")
  } else {
    console.log("Re-run with --commands to print the deletion lines.\n")
  }
}

function* chunked(items, size) {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size)
}
