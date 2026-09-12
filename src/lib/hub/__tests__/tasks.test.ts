import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
}))
vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock }))

import { nextOccurrence, runTaskAutomations } from "../tasks"

const d = (iso: string) => new Date(iso)

describe("task recurrence — nextOccurrence", () => {
  it("none → null", () => {
    expect(nextOccurrence(d("2026-06-11T09:00:00"), "none")).toBeNull()
  })

  it("daily adds one day, keeping time of day", () => {
    const next = nextOccurrence(d("2026-06-11T09:00:00"), "daily")!
    expect(next.toISOString().slice(0, 13)).toBe(d("2026-06-12T09:00:00").toISOString().slice(0, 13))
  })

  it("weekdays skips Saturday and Sunday", () => {
    // Friday Jun 12 2026 → Monday Jun 15
    const next = nextOccurrence(d("2026-06-12T08:00:00"), "weekdays")!
    expect(next.getDay()).toBe(1)
    expect(next.getDate()).toBe(15)
  })

  it("weekly adds seven days", () => {
    const next = nextOccurrence(d("2026-06-11T08:00:00"), "weekly")!
    expect(next.getDate()).toBe(18)
  })

  it("monthly clamps Jan 31 → Feb 28 (non-leap)", () => {
    const next = nextOccurrence(d("2026-01-31T08:00:00"), "monthly")!
    expect(next.getMonth()).toBe(1) // February
    expect(next.getDate()).toBe(28) // 2026 is not a leap year
  })

  it("monthly keeps the same day when it fits", () => {
    const next = nextOccurrence(d("2026-06-15T08:00:00"), "monthly")!
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(15)
  })

  it("crosses a DST boundary without drifting the calendar day", () => {
    // US DST starts Mar 8 2026 (second Sunday of March).
    const next = nextOccurrence(d("2026-03-07T09:00:00"), "daily")!
    expect(next.getDate()).toBe(8)
    expect(next.getHours()).toBe(9) // local time preserved
  })
})

/**
 * Finding: the ternary picked ONE of {CDL, medical card} per driver, so a
 * driver with both expiring inside the 7-day window silently lost the other
 * nag — a 391.51 driver-qualification gap could go unflagged next to a
 * medical-card one. Fix flags each expiring document as its own task.
 */
describe("runTaskAutomations — driver CDL/med-card expiry", () => {
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue({ count: "0" })
  })

  it("creates a separate task for each document expiring within the window", async () => {
    const cdlExpiry = inDays(2)
    const medExpiry = inDays(4)
    const driver = { id: "driver-1", name: "Sam Trucker", cdl_expiry: cdlExpiry, medical_card_expiry: medExpiry }

    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("hub.compliance_items")) return []
      if (sql.includes("FROM hub.drivers")) return [driver]
      if (sql.includes("FROM hub.claims")) return []
      if (sql.includes("FROM hub.loads l")) return []
      if (sql.includes("INSERT INTO hub.tasks")) return [{ id: "task-created" }]
      return []
    })

    const result = await runTaskAutomations("carrier-1")

    const insertParams = queryMock.mock.calls
      .filter(([sql]) => String(sql).includes("INSERT INTO hub.tasks"))
      .map(([, params]) => params as unknown[])
    const automationKeys = insertParams.map((p) => p[p.length - 1])

    expect(automationKeys).toContain(`driver-expiry:driver-1:CDL:${cdlExpiry}`)
    expect(automationKeys).toContain(`driver-expiry:driver-1:medical card:${medExpiry}`)
    expect(result.created).toBe(2)
  })

  it("only flags the document that's actually expiring, not both", async () => {
    const cdlExpiry = inDays(2)
    const driver = { id: "driver-2", name: "Alex Hauler", cdl_expiry: cdlExpiry, medical_card_expiry: inDays(90) }

    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("hub.compliance_items")) return []
      if (sql.includes("FROM hub.drivers")) return [driver]
      if (sql.includes("FROM hub.claims")) return []
      if (sql.includes("FROM hub.loads l")) return []
      if (sql.includes("INSERT INTO hub.tasks")) return [{ id: "task-created" }]
      return []
    })

    const result = await runTaskAutomations("carrier-1")
    const insertParams = queryMock.mock.calls
      .filter(([sql]) => String(sql).includes("INSERT INTO hub.tasks"))
      .map(([, params]) => params as unknown[])
    const automationKeys = insertParams.map((p) => p[p.length - 1])

    expect(automationKeys).toEqual([`driver-expiry:driver-2:CDL:${cdlExpiry}`])
    expect(result.created).toBe(1)
  })
})

/**
 * #66: a truck grounded on an unsafe DVIR was visible only on its own truck
 * page. The sweep now files one urgent, deep-linked task per open defect
 * report, keyed on the DVIR id so a re-sweep cannot file it twice.
 */
describe("runTaskAutomations — DVIR awaiting repair", () => {
  const groundedRow = (over: Record<string, unknown> = {}) => ({
    dvir_id: "dvir-1",
    truck_id: "truck-1",
    truck_unit: "105",
    driver_name: "Sam Trucker",
    created_at: "2026-09-10T08:00:00.000Z",
    defects: [{ label: "Service brakes", note: "pulls left" }],
    ...over,
  })

  const world = (grounded: unknown[], insertReturns: unknown[] = [{ id: "task-created" }]) =>
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("hub.compliance_items")) return []
      if (sql.includes("FROM hub.drivers")) return []
      if (sql.includes("FROM hub.claims")) return []
      if (sql.includes("FROM hub.loads l")) return []
      if (sql.includes("FROM hub.dvirs v")) return grounded
      if (sql.includes("INSERT INTO hub.tasks")) return insertReturns
      return []
    })

  const inserts = () =>
    queryMock.mock.calls
      .filter(([sql]) => String(sql).includes("INSERT INTO hub.tasks"))
      .map(([, params]) => params as unknown[])

  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    queryOneMock.mockResolvedValue({ count: "0" })
  })

  it("files one urgent task per grounded truck, deep-linked to the truck page", async () => {
    world([groundedRow()])

    const result = await runTaskAutomations("carrier-1")

    const [params] = inserts()
    expect(params[0]).toBe("carrier-1")
    expect(params[1]).toBe("Unit 105 is grounded — certify the repair")
    expect(params[2]).toContain("Service brakes — pulls left")
    expect(params[2]).toContain("reported by Sam Trucker on 2026-09-10")
    expect(params[6]).toBe("2026-09-10T08:00:00.000Z") // due from the day it was grounded — overdue on arrival
    expect(params[7]).toBe("urgent")
    expect(params[8]).toBe("truck")
    expect(params[9]).toBe("truck-1")
    expect(params[params.length - 1]).toBe("dvir-open-defect:dvir-1")
    expect(result.created).toBe(1)
  })

  it("keys on the DVIR, so two grounded trucks make two tasks and a re-sweep makes none", async () => {
    world([groundedRow(), groundedRow({ dvir_id: "dvir-2", truck_id: "truck-2", truck_unit: "106", defects: [] })])
    await runTaskAutomations("carrier-1")
    const keys = inserts().map((p) => p[p.length - 1])
    expect(keys).toEqual(["dvir-open-defect:dvir-1", "dvir-open-defect:dvir-2"])
    expect(inserts()[1][2]).toContain("Defect · reported by")

    // Same world, but the INSERT's ON CONFLICT swallows both rows: nothing counted.
    world([groundedRow(), groundedRow({ dvir_id: "dvir-2", truck_id: "truck-2", truck_unit: "106" })], [])
    const again = await runTaskAutomations("carrier-1")
    expect(again.created).toBe(0)
  })
})
