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
 */
import { execSync } from "node:child_process"
import { pathToFileURL } from "node:url"

export function parseLabels(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function findExactTitle(issues, title) {
  return (issues ?? []).find((issue) => issue && issue.title === title) ?? null
}

function run(execFn, command) {
  return String(execFn(command, { encoding: "utf-8" }) ?? "").trim()
}

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

export function ensureGithubIssue(opts, execFn = execSync) {
  const title = String(opts.title ?? "").trim()
  if (!title) throw new Error("GH_ISSUE_TITLE is required")
  const body = String(opts.body ?? title)
  const comment = String(opts.comment ?? "").trim()
  const labels = opts.labels ?? []
  const mode = opts.mode === "body" ? "body" : "comment"

  const existing = findExactTitle(listIssuesByTitle(title, execFn), title)
  if (!existing) {
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
