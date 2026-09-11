/**
 * Hub migrations are append-only `NNN_slug.sql`. Two prefixes already
 * collided when parallel sessions shipped the same number (`024` and `029`).
 * Those files stay — the runner keys `hub_migrations` on filename, so
 * renaming an applied file would re-run it on some databases and skip it
 * on others. A third collision is a defect.
 */
import { describe, expect, it } from "vitest"
import { readdirSync } from "node:fs"
import path from "node:path"

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations", "hub")
const FILENAME_RE = /^(\d{3})_[a-z0-9_]+\.sql$/

/** Already-shipped collisions. Never renumber. Never add a third prefix. */
const KNOWN_COLLISIONS: Record<string, readonly string[]> = {
  "024": ["024_pay_per_mile_cents.sql", "024_share_link_expiry.sql"],
  "029": ["029_intake_drafts.sql", "029_thind_dot_number.sql"],
}

function prefixOf(file: string): string | null {
  const match = file.match(FILENAME_RE)
  return match ? match[1] : null
}

function groupByPrefix(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const file of files) {
    const prefix = prefixOf(file)
    if (!prefix) continue
    const list = groups.get(prefix) ?? []
    list.push(file)
    groups.set(prefix, list)
  }
  return groups
}

function unexpectedCollisions(
  groups: Map<string, string[]>,
  known: Record<string, readonly string[]>,
): string[] {
  const bad: string[] = []
  for (const [prefix, files] of groups) {
    if (files.length < 2) continue
    const allowed = known[prefix]
    const got = [...files].sort().join("\0")
    const want = allowed ? [...allowed].sort().join("\0") : ""
    if (!allowed || got !== want) {
      bad.push(`${prefix}: ${[...files].sort().join(", ")}`)
    }
  }
  return bad
}

function nextFreePrefix(files: string[]): string {
  let max = 0
  for (const file of files) {
    const prefix = prefixOf(file)
    if (!prefix) continue
    max = Math.max(max, Number(prefix))
  }
  return String(max + 1).padStart(3, "0")
}

const sqlFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort()

describe("unexpectedCollisions", () => {
  it("allows the documented 024 and 029 pairs and nothing else", () => {
    const groups = groupByPrefix([
      "023_lead_attribution.sql",
      "024_pay_per_mile_cents.sql",
      "024_share_link_expiry.sql",
      "029_intake_drafts.sql",
      "029_thind_dot_number.sql",
      "032_pickup_verifications.sql",
    ])
    expect(unexpectedCollisions(groups, KNOWN_COLLISIONS)).toEqual([])
  })

  it("flags a new prefix collision", () => {
    const groups = groupByPrefix([
      "033_alpha.sql",
      "033_bravo.sql",
    ])
    expect(unexpectedCollisions(groups, KNOWN_COLLISIONS)).toEqual([
      "033: 033_alpha.sql, 033_bravo.sql",
    ])
  })

  it("flags a third file on an allowlisted prefix", () => {
    const groups = groupByPrefix([
      "024_pay_per_mile_cents.sql",
      "024_share_link_expiry.sql",
      "024_extra.sql",
    ])
    expect(unexpectedCollisions(groups, KNOWN_COLLISIONS)).toEqual([
      "024: 024_extra.sql, 024_pay_per_mile_cents.sql, 024_share_link_expiry.sql",
    ])
  })
})

describe("migrations/hub prefixes", () => {
  it("finds the sql files (guard is not silently vacuous)", () => {
    expect(sqlFiles.length).toBeGreaterThan(20)
  })

  it("every sql file matches NNN_slug.sql", () => {
    const bad = sqlFiles.filter((file) => !FILENAME_RE.test(file))
    expect(bad, `rename to NNN_slug.sql: ${bad.join(", ")}`).toEqual([])
  })

  it("allowlists only the two shipped collisions and fails on a new one", () => {
    const groups = groupByPrefix(sqlFiles)
    for (const [prefix, files] of Object.entries(KNOWN_COLLISIONS)) {
      expect(groups.get(prefix)?.sort(), `known ${prefix} pair missing`).toEqual(
        [...files].sort(),
      )
    }
    expect(unexpectedCollisions(groups, KNOWN_COLLISIONS)).toEqual([])
  })

  it("next free prefix is max(existing) + 1", () => {
    expect(nextFreePrefix(sqlFiles)).toBe("033")
    expect(sqlFiles.some((file) => file.startsWith("033_"))).toBe(false)
  })
})
