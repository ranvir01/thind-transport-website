import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * The AGENT_INTEROP §1 clock is the fleet's only collision control: two
 * scheduled writers firing in the same minute is how a diverged main gets
 * made, and a schedule that exists only in a workflow file (or only in a
 * dashboard) is invisible to every other agent. This guard makes the
 * non-overlap rule mechanical:
 *
 *   1. every scheduled workflow is named in FLEET.md (the live roster)
 *   2. every cron minute appears on the AGENT_INTEROP clock
 *   3. hourly minutes never collide — across workflows AND the documented
 *      Cursor automations (:00/:30/:59) and Claude routine (:43)
 *   4. daily/weekly crons stay off the hourly minutes (branch-reaper is the
 *      one documented exception — Sunday 06:00 targets only fully-merged
 *      branches, provably disjoint from the :00 integrator's unmerged set)
 *   5. the reserved D-003 minutes (:07/:13/:37, dormant Claude build slots)
 *      stay clear until the owner creates those routines
 *
 * prune-merged-branches.yml ran daily at 06:23 for weeks without a row on
 * the clock — found while writing this guard. Rule 1/2 exist so that cannot
 * recur.
 */

const WORKFLOWS_DIR = path.join(process.cwd(), ".github/workflows")
const interop = readFileSync(
  path.join(process.cwd(), "docs/ops/AGENT_INTEROP.md"),
  "utf-8"
)
const fleet = readFileSync(path.join(process.cwd(), "docs/ops/FLEET.md"), "utf-8")

// Scheduled agents that live in dashboards, not in .github/workflows.
// Ids and prompts: docs/ops/FLEET.md.
const DASHBOARD_AGENT_MINUTES: Record<number, string> = {
  0: "Cursor Integrator automation",
  30: "Cursor Prod Smoke automation",
  43: "Claude integrator routine",
  59: "Cursor Deploy + backlog automation",
}

// D-003 (docs/ops/DECISIONS.md): dormant daily Claude build slots reserve
// these minutes so the owner can enable them without a reshuffle.
const RESERVED_DORMANT_MINUTES = [7, 13, 37]

// Weekly jobs allowed to share an hourly minute because their write targets
// are disjoint by construction (merged-only vs the integrator's unmerged-only).
const HOURLY_MINUTE_EXCEPTIONS = ["branch-reaper.yml"]

interface CronEntry {
  file: string
  expr: string
  minutes: number[]
  hourField: string
}

function collectCrons(): CronEntry[] {
  const entries: CronEntry[] = []
  for (const file of readdirSync(WORKFLOWS_DIR)) {
    if (!/\.ya?ml$/.test(file)) continue
    const body = readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8")
    for (const match of body.matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)) {
      const fields = match[1].trim().split(/\s+/)
      expect(fields, `${file} cron "${match[1]}" must have 5 fields`).toHaveLength(5)
      entries.push({
        file,
        expr: match[1],
        minutes: fields[0].split(",").map(Number),
        hourField: fields[1],
      })
    }
  }
  return entries
}

const crons = collectCrons()
const hourly = crons.filter((c) => c.hourField === "*")
const nonHourly = crons.filter((c) => c.hourField !== "*")

describe("fleet clock guard (no two schedulers on one minute)", () => {
  it("found the scheduled workflows it exists to police", () => {
    expect(crons.length).toBeGreaterThanOrEqual(5)
  })

  it("every scheduled workflow is on the FLEET.md roster", () => {
    for (const c of crons) {
      expect(fleet, `${c.file} is scheduled but not in docs/ops/FLEET.md`).toContain(c.file)
    }
  })

  it("every cron minute appears on the AGENT_INTEROP clock", () => {
    for (const c of hourly) {
      for (const m of c.minutes) {
        const token = `\`:${String(m).padStart(2, "0")}\``
        expect(interop, `${c.file} fires hourly at :${m} — no ${token} row in AGENT_INTEROP §1`).toContain(token)
      }
    }
    for (const c of nonHourly) {
      const hour = Number(c.hourField)
      for (const m of c.minutes) {
        const token = `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        expect(interop, `${c.file} fires at ${token} — no such row in AGENT_INTEROP §1`).toContain(token)
      }
    }
  })

  it("hourly minutes are unique across workflows and dashboard agents", () => {
    const seen = new Map<number, string>(
      Object.entries(DASHBOARD_AGENT_MINUTES).map(([m, who]) => [Number(m), who])
    )
    for (const c of hourly) {
      for (const m of c.minutes) {
        expect(
          seen.has(m),
          `minute :${m} is used by both ${c.file} and ${seen.get(m) ?? ""}`
        ).toBe(false)
        seen.set(m, c.file)
      }
    }
  })

  it("daily/weekly crons stay off the hourly minutes (reaper excepted)", () => {
    const hourlyMinutes = new Set<number>([
      ...Object.keys(DASHBOARD_AGENT_MINUTES).map(Number),
      ...hourly.flatMap((c) => c.minutes),
    ])
    for (const c of nonHourly) {
      if (HOURLY_MINUTE_EXCEPTIONS.includes(c.file)) continue
      for (const m of c.minutes) {
        expect(
          hourlyMinutes.has(m),
          `${c.file} (${c.expr}) collides once a day with the hourly job at :${m}`
        ).toBe(false)
      }
    }
  })

  it("keeps the reserved D-003 minutes clear until the owner enables those slots", () => {
    for (const c of crons) {
      for (const m of c.minutes) {
        expect(
          RESERVED_DORMANT_MINUTES.includes(m),
          `${c.file} took reserved dormant minute :${m} (D-003 Claude build slots)`
        ).toBe(false)
      }
    }
  })

  it("the reserved minutes and dormant slots are documented in AGENT_INTEROP", () => {
    expect(interop).toMatch(/Dormant, reserved/)
    for (const m of RESERVED_DORMANT_MINUTES) {
      expect(interop).toContain(`:${String(m).padStart(2, "0")}\``)
    }
  })
})
