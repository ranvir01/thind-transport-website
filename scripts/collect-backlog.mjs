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

/** Join wrapped bullets: continuation lines lack a leading "- " / "* ". */
export function parseBacklogBullets(backlogBlock) {
  const bullets = []
  let current = null

  for (const line of backlogBlock.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/^[-*]\s/.test(line)) {
      if (current) bullets.push(current)
      current = line.replace(/^[-*]\s*/, "").trim()
      continue
    }

    if (current) {
      current = `${current} ${trimmed}`
    }
  }

  if (current) bullets.push(current)
  return bullets
}

/** Comparison key: tolerate case/whitespace/trailing-punctuation drift between
 * commits, so a bullet re-listed with a period added still counts as carried. */
export function normalizeBullet(text) {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim()
}

function collectItems() {
  git("fetch origin --quiet")
  const out = git(`log ${ref} -n ${limit} --format=%H---%s---%B${RECORD_SEP}`)
  const seen = new Set()
  const items = []
  let backlogCommitIndex = -1

  for (const chunk of out.split(RECORD_SEP)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    // %B follows the third --- with no newline (unlike %b); subject must be non-greedy.
    // git log inserts a newline between formatted records when %B ends with \n — trim each chunk.
    const header = trimmed.match(/^([a-f0-9]+)---(.+?)---([\s\S]*)$/i)
    if (!header) continue
    const [, hash, subject, body] = header
    const match = body.match(/(?:^|\n)Backlog:\s*\n([\s\S]*)/i)
    if (!match) continue
    backlogCommitIndex++
    const backlogBlock = match[1].split(/\n\n/)[0]
    for (const text of parseBacklogBullets(backlogBlock)) {
      const key = normalizeBullet(text)
      if (!key || seen.has(key)) continue
      seen.add(key)
      items.push({ text, hash: hash.slice(0, 7), subject, commitIndex: backlogCommitIndex })
    }
  }
  return items
}

/** Deploy-agent meta bullets — state snapshots, not shippable backlog work. */
export function isDeployMetaItem(text) {
  if (/^CATCH-UP MODE:/i.test(text)) return true
  if (/integrator.*commits ahead/i.test(text)) return true
  if (/on integrator.*pending deploy/i.test(text)) return true
  if (/integrator absorbs one per/i.test(text)) return true
  if (/duplicate.*skip on next run/i.test(text)) return true
  if (/pending claude\/\* session branches/i.test(text)) return true
  return false
}

/**
 * Split bullets into the current open list vs. older mentions. Convention
 * (AGENTS.md improvement loop): every commit ends with the FULL updated
 * backlog, so the newest Backlog block is the canonical open list — a bullet
 * from an older commit that was not carried forward is resolved or superseded
 * and must not drive ranking or TOP PICK. `items` must be newest-first
 * (git log order) with `commitIndex` 0 on the newest backlog-bearing commit.
 */
export function splitCurrentAndOlder(items) {
  const current = items.filter((item) => item.commitIndex === 0)
  const older = items.filter((item) => item.commitIndex !== 0)
  return { current, older }
}

function rankItem(text) {
  // Fleet-configuration items need owner approval — never auto-pick for deploy agent.
  if (/^owner:/i.test(text)) return PRIORITY.length - 1
  // Stale catch-up / integrator state — never outrank real product backlog.
  if (isDeployMetaItem(text)) return PRIORITY.length - 1

  for (let i = 0; i < PRIORITY.length; i++) {
    if (PRIORITY[i].test.test(text)) return i
  }
  return PRIORITY.length - 1
}

function isPickable(item) {
  // "owner call on X" / "needs owner approval" mid-bullet block auto-pick too.
  if (/owner (call|approval|decision)/i.test(item.text)) return false
  return !/^owner:/i.test(item.text) && !isDeployMetaItem(item.text)
}

/** Pick from the current list; fall back to older mentions only when the
 * newest Backlog carries nothing pickable (e.g. a narrow integrator commit). */
export function topPickItem(current, older) {
  const pick = current.find(isPickable)
  if (pick) return { pick, stale: false }
  const fallback = older.find(isPickable)
  if (fallback) return { pick: fallback, stale: true }
  return { pick: null, stale: false }
}

function main() {
  const items = collectItems()
  items.sort((a, b) => rankItem(a.text) - rankItem(b.text) || a.text.localeCompare(b.text))
  const { current, older } = splitCurrentAndOlder(items)

  console.log(`Backlog items from last ${limit} commits on ${ref}`)
  console.log("=".repeat(60))

  if (!items.length) {
    console.log("(empty — no Backlog: trailers found)")
    return
  }

  let lastRank = -1
  for (const item of current) {
    const rank = rankItem(item.text)
    if (rank !== lastRank) {
      console.log(`\n## ${PRIORITY[rank].label}`)
      lastRank = rank
    }
    console.log(`- ${item.text}`)
    console.log(`  (from ${item.hash} ${item.subject})`)
  }

  if (older.length) {
    console.log("\n## Older mentions (not carried in newest Backlog — likely resolved; verify before picking)")
    for (const item of older) {
      console.log(`- ${item.text}`)
      console.log(`  (from ${item.hash} ${item.subject})`)
    }
  }

  console.log("\n--- TOP PICK (steady-state deploy agent) ---")
  const { pick, stale } = topPickItem(current, older)
  if (pick) {
    console.log(stale ? `${pick.text}\n(stale fallback — newest Backlog had nothing pickable; verify still open)` : pick.text)
  } else {
    console.log("(none — remaining items are owner-only or deploy/integrator meta; stop without committing)")
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
