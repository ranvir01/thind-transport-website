#!/usr/bin/env node
/**
 * Collect and rank Backlog: items from recent commits.
 *
 * Usage:
 *   node scripts/collect-backlog.mjs
 *   node scripts/collect-backlog.mjs origin/main 50
 */
import { execSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const PRIORITY = [
  { key: "production", label: "Production-breaking", test: /prod(uction)?|breaking|deploy|outage|500|crash|login fail/i },
  { key: "money", label: "Money-correctness", test: /money|cent|invoice|settlement|ifta|pay rule|audit/i },
  { key: "workflow", label: "Daily-workflow friction", test: /workflow|dispatch|driver|load board|planner|UX|friction/i },
  { key: "polish", label: "Polish", test: /.*/ },
]

// ASCII unit/record separators — cannot appear in commit subjects or bodies,
// unlike "---", which collided with subjects and the ---END--- sentinel and
// made the old parser drop every commit.
export const FIELD_SEP = "\x1f"
export const RECORD_SEP = "\x1e"
// %x1f/%x1e keep the shell command plain ASCII; git expands them to the bytes above.
export const LOG_FORMAT = "%H%x1f%s%x1f%b%x1e"

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim()
}

/** Pull bullet lines out of the "Backlog:" trailer of one commit body. */
export function extractBacklog(body) {
  const lines = body.split("\n")
  const start = lines.findIndex((line) => /^backlog:\s*$/i.test(line.trim()))
  if (start === -1) return []
  const items = []
  for (const line of lines.slice(start + 1)) {
    const bullet = line.match(/^\s*[-*]\s+(.*\S)\s*$/)
    if (!bullet) break
    items.push(bullet[1])
  }
  return items
}

/** Parse `git log --format=LOG_FORMAT` output into deduped backlog items. */
export function parseCommits(raw) {
  const seen = new Set()
  const items = []
  for (const record of raw.split(RECORD_SEP)) {
    const [hash, subject, body] = record.replace(/^\n/, "").split(FIELD_SEP)
    if (!hash || subject === undefined || body === undefined) continue
    for (const text of extractBacklog(body)) {
      if (seen.has(text.toLowerCase())) continue
      seen.add(text.toLowerCase())
      items.push({ text, hash: hash.slice(0, 7), subject })
    }
  }
  return items
}

export function rankItem(text) {
  for (let i = 0; i < PRIORITY.length; i++) {
    if (PRIORITY[i].test.test(text)) return i
  }
  return PRIORITY.length - 1
}

function main() {
  const ref = process.argv[2] ?? "origin/main"
  const limit = Number(process.argv[3] ?? "30")

  git("fetch origin --quiet")
  const items = parseCommits(git(`log ${ref} -n ${limit} --format=${LOG_FORMAT}`))
  items.sort((a, b) => rankItem(a.text) - rankItem(b.text) || a.text.localeCompare(b.text))

  console.log(`Backlog items from last ${limit} commits on ${ref}`)
  console.log("=".repeat(60))

  if (!items.length) {
    console.log("(empty — no Backlog: trailers found)")
    return
  }

  let lastRank = -1
  for (const item of items) {
    const rank = rankItem(item.text)
    if (rank !== lastRank) {
      console.log(`\n## ${PRIORITY[rank].label}`)
      lastRank = rank
    }
    console.log(`- ${item.text}`)
    console.log(`  (from ${item.hash} ${item.subject})`)
  }

  console.log("\n--- TOP PICK (steady-state deploy agent) ---")
  console.log(items[0].text)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
