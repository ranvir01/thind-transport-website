#!/usr/bin/env node
/**
 * Friday digest: open `should` / `needs-owner` issues grouped by venture:* plus
 * a pointer at the live fleet. Writes one create-or-update issue whose title is
 * stable so the run is idempotent.
 */
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { ensureGithubIssue } from "./ensure-github-issue.mjs"

const DIGEST_TITLE = "[fleet] Portfolio digest"

function ghJson(cmd) {
  try {
    const raw = execSync(cmd, { encoding: "utf-8" }).trim()
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function ventureOf(issue) {
  const names = (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name))
  return names.find((n) => n.startsWith("venture:")) ?? "venture:unlabeled"
}

function renderGroup(heading, issues) {
  if (!issues.length) return `### ${heading}\n\n_(none)_\n`
  const lines = issues
    .sort((a, b) => a.number - b.number)
    .map((issue) => `- #${issue.number} ${issue.title}`)
  return `### ${heading}\n\n${lines.join("\n")}\n`
}

export function buildDigestBody({ shouldIssues, ownerIssues, generatedAt, fleetSnippet }) {
  const byVenture = new Map()
  for (const issue of shouldIssues) {
    const key = ventureOf(issue)
    if (!byVenture.has(key)) byVenture.set(key, [])
    byVenture.get(key).push(issue)
  }
  const ventureBlocks = [...byVenture.keys()]
    .sort()
    .map((key) => renderGroup(key, byVenture.get(key)))
    .join("\n")

  return [
    `Generated ${generatedAt}. Agents act only on collaborator-labeled \`should\` issues.`,
    "",
    "## Open should",
    "",
    ventureBlocks || "_(none)_",
    "",
    "## Parked needs-owner",
    "",
    renderGroup("needs-owner", ownerIssues),
    "",
    "## Fleet (from docs/ops/FLEET.md)",
    "",
    "```",
    fleetSnippet,
    "```",
    "",
    "Canonical registry: `docs/ops/PORTFOLIO.md`.",
  ].join("\n")
}

function main() {
  const shouldIssues = ghJson(
    "gh issue list --label should --state open --json number,title,labels --limit 50"
  )
  const ownerIssues = ghJson(
    "gh issue list --label needs-owner --state open --json number,title,labels --limit 50"
  )
  let fleetSnippet = "(docs/ops/FLEET.md missing on this checkout)"
  try {
    const fleet = readFileSync(path.join(process.cwd(), "docs/ops/FLEET.md"), "utf-8")
    const live = fleet.split("\n").slice(0, 40).join("\n")
    fleetSnippet = live.slice(0, 1200)
  } catch {
    /* keep fallback */
  }

  const body = buildDigestBody({
    shouldIssues,
    ownerIssues,
    generatedAt: new Date().toISOString(),
    fleetSnippet,
  })

  const result = ensureGithubIssue({
    title: DIGEST_TITLE,
    body,
    labels: ["should"],
    mode: "body",
  })
  console.log(`digest ${result.action}${result.number ? ` #${result.number}` : ""}`)
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) main()
