#!/usr/bin/env node
/**
 * Create-or-comment a GitHub issue identified by exact title (D-012).
 * Used by fleet-liveness / e2e-suite on red, and by portfolio-digest.
 *
 * Env:
 *   GH_ISSUE_TITLE     required
 *   GH_ISSUE_BODY      used on create; also on body-mode updates
 *   GH_ISSUE_COMMENT   used when the issue already exists (comment mode)
 *   GH_ISSUE_LABELS    comma-separated; applied on create
 *   GH_ISSUE_MODE      "comment" (default) or "body"
 *
 * `execFn` is injectable for tests. Missing `gh` throws — callers in CI have
 * GITHUB_TOKEN; the backlog collector is the one that must stay silent.
 *
 * Fine-grained PATs can create issues (and even create label *names* as a
 * side-effect) but 403 on PATCH, so Actions must `gh label create` before
 * `gh issue create --label` — GITHUB_TOKEN can attach labels; the PAT cannot.
 */
import { execSync } from "node:child_process"
import { pathToFileURL } from "node:url"

/**
 * @typedef {(command: string, options?: { encoding?: string }) => string | Buffer} GhExec
 * @typedef {{ number?: number, title?: string, state?: string }} GhIssue
 * @typedef {{ title?: string, body?: string, comment?: string, labels?: string[], mode?: string }} EnsureOpts
 * @typedef {{ action: string, number?: number, output?: string }} EnsureResult
 */

/** Known queue labels (D-012). `--force` is idempotent and paints the first-run greys. */
export const QUEUE_LABELS = {
  should: { color: "0E7C7B", description: "Dispatchable fleet work (collaborator-curated)" },
  "needs-owner": { color: "D97706", description: "Parked for Ranvir — agents do not pick" },
  "venture:loadoff": { color: "1B3A4B", description: "LoadOff / this repo" },
  "venture:ar-payments": { color: "0F766E", description: "AR Payments LLC holding/billing" },
  "venture:myco": { color: "1D4ED8", description: "MyConsulting" },
  "venture:career": { color: "6D28D9", description: "Career OS / Rav" },
  "venture:bls": { color: "334155", description: "bls-website proof" },
}

/** @param {string[]} names @param {GhExec} [execFn] */
export function ensureQueueLabels(names, execFn = execSync) {
  for (const name of names) {
    const meta = QUEUE_LABELS[name] ?? { color: "ededed", description: name }
    try {
      run(
        execFn,
        `gh label create ${JSON.stringify(name)} --color ${JSON.stringify(meta.color)} --description ${JSON.stringify(meta.description)} --force`
      )
    } catch {
      // no gh / no permission — create still tries --label
    }
  }
}

/** @param {string | undefined} raw @returns {string[]} */
export function parseLabels(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/** @param {GhIssue[]} issues @param {string} title @returns {GhIssue | null} */
export function findExactTitle(issues, title) {
  return (issues ?? []).find((issue) => issue && issue.title === title) ?? null
}

/** @param {GhExec} execFn @param {string} command */
function run(execFn, command) {
  return String(execFn(command, { encoding: "utf-8" }) ?? "").trim()
}

/** @param {string} title @param {GhExec} [execFn] @returns {GhIssue[]} */
export function listIssuesByTitle(title, execFn = execSync) {
  const escaped = String(title).replace(/"/g, '\\"')
  const raw = run(
    execFn,
    `gh issue list --state all --limit 30 --json number,title,state --search "in:title \\"${escaped}\\""`
  )
  try {
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {EnsureOpts} opts @param {GhExec} [execFn] @returns {EnsureResult} */
export function ensureGithubIssue(opts, execFn = execSync) {
  const title = String(opts.title ?? "").trim()
  if (!title) throw new Error("GH_ISSUE_TITLE is required")
  const body = String(opts.body ?? title)
  const comment = String(opts.comment ?? "").trim()
  const labels = opts.labels ?? []
  const mode = opts.mode === "body" ? "body" : "comment"

  const existing = findExactTitle(listIssuesByTitle(title, execFn), title)
  if (!existing) {
    if (labels.length) ensureQueueLabels(labels, execFn)
    const labelFlags = labels.map((name) => `--label ${JSON.stringify(name)}`).join(" ")
    const created = run(
      execFn,
      `gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}${labelFlags ? ` ${labelFlags}` : ""}`
    )
    return { action: "created", output: created }
  }

  const number = existing.number
  if (String(existing.state).toUpperCase() === "CLOSED") {
    run(execFn, `gh issue reopen ${number}`)
  }
  if (mode === "body") {
    run(execFn, `gh issue edit ${number} --body ${JSON.stringify(body)}`)
    return { action: "updated", number }
  }
  const text = comment || `Still red. See ${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY ?? "ranvir01/thind-transport-website"}/actions/runs/${process.env.GITHUB_RUN_ID ?? "latest"}.`
  run(execFn, `gh issue comment ${number} --body ${JSON.stringify(text)}`)
  return { action: "commented", number }
}

function main() {
  const result = ensureGithubIssue({
    title: process.env.GH_ISSUE_TITLE,
    body: process.env.GH_ISSUE_BODY,
    comment: process.env.GH_ISSUE_COMMENT,
    labels: parseLabels(process.env.GH_ISSUE_LABELS),
    mode: process.env.GH_ISSUE_MODE,
  })
  console.log(`${result.action}${result.number ? ` #${result.number}` : ""} ${result.output ?? ""}`.trim())
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
