#!/usr/bin/env node
/**
 * Collect and rank Backlog: items from recent commits.
 *
 * Usage:
 *   node scripts/collect-backlog.mjs
 *   node scripts/collect-backlog.mjs origin/main 50
 */
import { execSync } from "node:child_process"

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

function collectItems() {
  git("fetch origin --quiet")
  const out = git(`log ${ref} -n ${limit} --format=%H---%s---%B---END---`)
  const seen = new Set()
  const items = []

  for (const chunk of out.split("---END---")) {
    const header = chunk.match(/^([a-f0-9]+)---(.+)---\n([\s\S]*)$/i)
    if (!header) continue
    const [, hash, subject, body] = header
    const match = body.match(/\nBacklog:\s*\n([\s\S]*?)(?:\n\n|$)/i)
    if (!match) continue
    for (const line of match[1].split("\n")) {
      const text = line.replace(/^[-*]\s*/, "").trim()
      if (!text || seen.has(text.toLowerCase())) continue
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

main()
