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

const ref = process.argv[2] ?? "origin/main"
const limit = Number(process.argv[3] ?? "30")

const PRIORITY = [
  { key: "production", label: "Production-breaking", test: /prod(uction)?|breaking|deploy|outage|500|crash|login fail/i },
  { key: "money", label: "Money-correctness", test: /money|cent|invoice|settlement|ifta|pay rule|audit/i },
  { key: "workflow", label: "Daily-workflow friction", test: /workflow|dispatch|driver|load board|planner|UX|friction/i },
  { key: "polish", label: "Polish", test: /.*/ },
]

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim()
}

const RECORD_SEP = "\x1eCOMMIT\x1e"

/**
 * Pull the Backlog: bullet list out of one commit body. Bullets wrapped over
 * multiple lines (continuation lines with no leading -/*) are joined back
 * into a single item; a git trailer line (Co-authored-by: etc.) ends the
 * block even when no blank line precedes it.
 */
export function parseBacklogItems(body) {
  const match = body.match(/(?:^|\n)Backlog:\s*\n([\s\S]*)/i)
  if (!match) return []
  const block = match[1].split(/\n\n/)[0]
  const items = []
  for (const line of block.split("\n")) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      items.push(bullet[1].trim())
      continue
    }
    const text = line.trim()
    if (!text) continue
    if (/^[A-Za-z][\w-]*:\s/.test(text)) break
    if (items.length) items[items.length - 1] += ` ${text}`
    else items.push(text)
  }
  return items.filter(Boolean)
}

function collectItems() {
  git("fetch origin --quiet")
  const out = git(`log ${ref} -n ${limit} --format=%H---%s---%B${RECORD_SEP}`)
  const seen = new Set()
  const items = []

  for (const chunk of out.split(RECORD_SEP)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    // %B follows the third --- with no newline (unlike %b); subject must be non-greedy.
    // git log inserts a newline between formatted records when %B ends with \n — trim each chunk.
    const header = trimmed.match(/^([a-f0-9]+)---(.+?)---([\s\S]*)$/i)
    if (!header) continue
    const [, hash, subject, body] = header
    for (const text of parseBacklogItems(body)) {
      if (seen.has(text.toLowerCase())) continue
      seen.add(text.toLowerCase())
      items.push({ text, hash: hash.slice(0, 7), subject })
    }
  }
  return items
}

function rankItem(text) {
  for (let i = 0; i < PRIORITY.length; i++) {
    if (PRIORITY[i].test.test(text)) return i
  }
  return PRIORITY.length - 1
}

function main() {
  const items = collectItems()
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

// Importable for tests: only run when executed directly (node scripts/collect-backlog.mjs).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
