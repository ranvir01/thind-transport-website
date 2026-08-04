/**
 * ELD-file import planner — matching, dedup, and the clocks-on-last-event
 * rule, tested without a database. The parser's own correctness is covered
 * in eld-output-file.test.ts; this suite owns what happens between a parsed
 * file and hos_snapshots rows.
 */
import { describe, expect, it } from "vitest"
import { planEldSnapshotRows } from "../eld-import"
import type { EldFileParseOk } from "../eld-output-file"

const parsed = (drivers: EldFileParseOk["drivers"]): EldFileParseOk => ({
  ok: true,
  header: { eldIdentifier: "ELD1", carrierName: "Thind Transport LLC", utcOffsetHours: -8 },
  drivers,
  skippedLines: 0,
})

const day = (h: number, m = 0) =>
  `2026-01-07T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`

// One completed hour of driving (13:00→14:00) before the final event, so the
// drive clock can tell a full-log computation (600 left) apart from one that
// only saw fresh events (660 left).
const GURJIT = {
  userOrder: 1,
  lastName: "Sandhu",
  firstName: "Gurjit",
  skippedLines: 0,
  events: [
    { status: "off" as const, at: day(0) },
    { status: "driving" as const, at: day(13) },
    { status: "on_duty" as const, at: day(14) },
    { status: "driving" as const, at: day(14, 30) },
  ],
}

const roster = new Map([["gurjit sandhu", "driver-uuid-1"]])

describe("planEldSnapshotRows", () => {
  it("matches by roster name and emits one row per event, clocks on the last only", () => {
    const plan = planEldSnapshotRows(parsed([GURJIT]), roster, new Map())
    expect(plan.matchedDrivers).toBe(1)
    expect(plan.rows).toHaveLength(4)
    expect(plan.rows.slice(0, 3).every((r) => r.driveRemainingMinutes === undefined)).toBe(true)
    const last = plan.rows[3]!
    expect(last.dutyStatus).toBe("driving")
    // As of 14:30: one hour driven (13:00→14:00), window open since 13:00.
    expect(last.driveRemainingMinutes).toBe(11 * 60 - 60)
    expect(last.shiftRemainingMinutes).toBe(14 * 60 - 90)
  })

  it("an unmatched driver is reported by name, never guessed at", () => {
    const plan = planEldSnapshotRows(parsed([{ ...GURJIT, firstName: "G", lastName: "S" }]), roster, new Map())
    expect(plan.matchedDrivers).toBe(0)
    expect(plan.rows).toHaveLength(0)
    expect(plan.unmatchedDrivers).toEqual(["G S"])
  })

  it("re-uploading the same file is a no-op", () => {
    const first = planEldSnapshotRows(parsed([GURJIT]), roster, new Map())
    const existing = new Map([["driver-uuid-1", new Set(first.rows.map((r) => r.ts))]])
    const replay = planEldSnapshotRows(parsed([GURJIT]), roster, existing)
    expect(replay.rows).toHaveLength(0)
    expect(replay.skippedDuplicates).toBe(4)
  })

  it("a partial re-upload computes clocks over the FULL log, not just new events", () => {
    // First three events already imported; only the 14:30 driving event is new.
    const existing = new Map([["driver-uuid-1", new Set([day(0), day(13), day(14)])]])
    const plan = planEldSnapshotRows(parsed([GURJIT]), roster, existing)
    expect(plan.rows).toHaveLength(1)
    // Computed from the one fresh event alone, no driving has happened and
    // this would read 660; the 13:00→14:00 hour must still count.
    expect(plan.rows[0]!.driveRemainingMinutes).toBe(600)
    expect(plan.skippedDuplicates).toBe(3)
  })
})
