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

/** Parse `git log --format=LOG_FORMAT` output into deduped backlog items. */
export function parseCommits(raw) {
  const seen = new Set()
  const items = []
  let backlogCommitIndex = -1

  for (const record of raw.split(RECORD_SEP)) {
    const [hash, subject, body] = record.replace(/^\n/, "").split(FIELD_SEP)
    if (!hash || subject === undefined || body === undefined) continue

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

export function rankItem(text) {
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
  const ref = process.argv[2] ?? "origin/main"
  const limit = Number(process.argv[3] ?? "30")

  git("fetch origin --quiet")
  const items = parseCommits(git(`log ${ref} -n ${limit} --format=${LOG_FORMAT}`))
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
