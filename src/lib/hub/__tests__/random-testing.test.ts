/**
 * Random drug/alcohol testing pool (49 CFR 382.305): quarterly pool size is
 * ceil(active drivers * annual rate / 4); selection and notification are
 * idempotent per (carrier, driver, period, test_type) so a retried cron run
 * never re-selects a full pool or double-notifies an already-notified driver.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, notifyDriver, logAudit } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  notifyDriver: vi.fn(async () => undefined),
  logAudit: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: vi.fn(async () => null) }))
vi.mock("../notify", () => ({ notifyDriver }))
vi.mock("../audit", () => ({ logAudit }))

let settings = { randomTesting: { drugPct: 50, alcoholPct: 10 } }
vi.mock("../settings", () => ({
  getCarrierSettings: vi.fn(async () => settings),
}))

import {
  currentTestingPeriod, listRandomTestEvents, notifyRandomTestPool,
  randomTestingSummary, recordRandomTestResult, selectRandomTestPool,
} from "../random-testing"

const CARRIER = "carrier-1"
const PERIOD = "2026Q3"

function routeQuery(handlers: Record<string, unknown>) {
  queryMock.mockImplementation(async (sql: string) => {
    for (const [needle, result] of Object.entries(handlers)) {
      if (sql.includes(needle)) return typeof result === "function" ? (result as () => unknown)() : result
    }
    throw new Error(`unexpected query: ${sql}`)
  })
}

describe("currentTestingPeriod", () => {
  it("labels the FMCSA quarter from a UTC date", () => {
    expect(currentTestingPeriod(new Date("2026-07-23T00:00:00Z"))).toBe("2026Q3")
    expect(currentTestingPeriod(new Date("2026-01-01T00:00:00Z"))).toBe("2026Q1")
    expect(currentTestingPeriod(new Date("2026-12-31T23:59:59Z"))).toBe("2026Q4")
  })
})

describe("selectRandomTestPool", () => {
  beforeEach(() => {
    queryMock.mockReset()
    logAudit.mockClear()
    settings = { randomTesting: { drugPct: 50, alcoholPct: 10 } }
  })

  it("selects nothing when there are no active drivers", async () => {
    routeQuery({
      "FROM hub.drivers": [],
    })
    const result = await selectRandomTestPool(CARRIER, "drug", PERIOD)
    expect(result).toEqual([])
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("computes quarterly pool size as ceil(active * annual% / 4) and fills it", async () => {
    // 20 active drivers @ 50% annual drug rate → ceil(20*0.5/4) = ceil(2.5) = 3
    const active = Array.from({ length: 20 }, (_, i) => ({ id: `driver-${i}` }))
    routeQuery({
      "FROM hub.drivers": active,
      "SELECT driver_id FROM hub.random_test_events": [],
      "INSERT INTO hub.random_test_events": [{ id: "evt-1" }, { id: "evt-2" }, { id: "evt-3" }],
      "JOIN hub.drivers d": [
        { id: "evt-1", driver_id: "driver-0", driver_name: "A B", test_type: "drug", period: PERIOD, status: "selected", result: null, selected_at: "now", notified_at: null, completed_on: null, notes: null },
        { id: "evt-2", driver_id: "driver-1", driver_name: "C D", test_type: "drug", period: PERIOD, status: "selected", result: null, selected_at: "now", notified_at: null, completed_on: null, notes: null },
        { id: "evt-3", driver_id: "driver-2", driver_name: "E F", test_type: "drug", period: PERIOD, status: "selected", result: null, selected_at: "now", notified_at: null, completed_on: null, notes: null },
      ],
    })
    const result = await selectRandomTestPool(CARRIER, "drug", PERIOD)
    expect(result).toHaveLength(3)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "selected", newValue: expect.objectContaining({ period: PERIOD, testType: "drug", count: 3 }) })
    )
  })

  it("is a no-op once the quarter's pool is already full", async () => {
    // 10 active @ 10% alcohol rate → ceil(10*0.1/4) = ceil(0.25) = 1; already 1 selected
    const active = Array.from({ length: 10 }, (_, i) => ({ id: `driver-${i}` }))
    routeQuery({
      "FROM hub.drivers": active,
      "SELECT driver_id FROM hub.random_test_events": [{ driver_id: "driver-0" }],
    })
    const result = await selectRandomTestPool(CARRIER, "alcohol", PERIOD)
    expect(result).toEqual([])
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO hub.random_test_events"), expect.anything())
  })

  it("tops up a partially-filled pool without re-selecting existing drivers", async () => {
    // pool size 3, 1 already selected → picks exactly 2 more from the remaining eligible pool
    const active = [{ id: "driver-0" }, { id: "driver-1" }, { id: "driver-2" }, { id: "driver-3" }]
    routeQuery({
      "FROM hub.drivers": active,
      "SELECT driver_id FROM hub.random_test_events": [{ driver_id: "driver-0" }],
      "INSERT INTO hub.random_test_events": (() => {
        return [{ id: "evt-2" }, { id: "evt-3" }]
      }),
      "JOIN hub.drivers d": [
        { id: "evt-2", driver_id: "driver-1", driver_name: "C D", test_type: "drug", period: PERIOD, status: "selected", result: null, selected_at: "now", notified_at: null, completed_on: null, notes: null },
        { id: "evt-3", driver_id: "driver-2", driver_name: "E F", test_type: "drug", period: PERIOD, status: "selected", result: null, selected_at: "now", notified_at: null, completed_on: null, notes: null },
      ],
    })
    settings = { randomTesting: { drugPct: 300, alcoholPct: 10 } } // forces pool size to 3 with 4 active
    const result = await selectRandomTestPool(CARRIER, "drug", PERIOD)
    expect(result).toHaveLength(2)
  })
})

describe("notifyRandomTestPool", () => {
  beforeEach(() => {
    queryMock.mockReset()
    notifyDriver.mockClear()
  })

  it("notifies every still-selected driver and flips them to notified", async () => {
    routeQuery({
      "WHERE carrier_id = $1 AND period = $2 AND test_type = $3 AND status = 'selected'": [
        { id: "evt-1", driver_id: "driver-0" },
      ],
      "SET status = 'notified'": undefined,
    })
    const result = await notifyRandomTestPool(CARRIER, "drug", PERIOD)
    expect(result).toEqual({ notified: 1 })
    expect(notifyDriver).toHaveBeenCalledWith(CARRIER, "driver-0", expect.objectContaining({ kind: "random_test" }))
  })

  it("is a no-op when nobody is pending", async () => {
    routeQuery({
      "WHERE carrier_id = $1 AND period = $2 AND test_type = $3 AND status = 'selected'": [],
    })
    const result = await notifyRandomTestPool(CARRIER, "alcohol", PERIOD)
    expect(result).toEqual({ notified: 0 })
    expect(notifyDriver).not.toHaveBeenCalled()
  })
})

describe("recordRandomTestResult", () => {
  it("writes status/result/completedOn/notes scoped to the carrier", async () => {
    queryMock.mockReset().mockResolvedValue([])
    await recordRandomTestResult(CARRIER, "evt-1", {
      status: "completed", result: "negative", completedOn: "2026-07-23", notes: "clean",
    })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.random_test_events"),
      [CARRIER, "evt-1", "completed", "negative", "2026-07-23", "clean"]
    )
  })
})

describe("randomTestingSummary", () => {
  beforeEach(() => {
    queryMock.mockReset()
    settings = { randomTesting: { drugPct: 50, alcoholPct: 10 } }
  })

  it("reports target pool size and selected-so-far per test type", async () => {
    const active = Array.from({ length: 20 }, (_, i) => ({ id: `driver-${i}` }))
    routeQuery({
      "FROM hub.drivers": active,
      "GROUP BY test_type": [{ test_type: "drug", count: "2" }],
    })
    const summary = await randomTestingSummary(CARRIER, PERIOD)
    expect(summary).toEqual({
      period: PERIOD,
      drug: { pct: 50, targetPoolSize: 3, selected: 2 },
      alcohol: { pct: 10, targetPoolSize: 1, selected: 0 },
    })
  })
})

describe("listRandomTestEvents", () => {
  it("filters by period when given one", async () => {
    queryMock.mockReset().mockResolvedValue([])
    await listRandomTestEvents(CARRIER, PERIOD)
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("AND e.period = $2"), [CARRIER, PERIOD])
  })

  it("omits the period filter when none given", async () => {
    queryMock.mockReset().mockResolvedValue([])
    await listRandomTestEvents(CARRIER)
    expect(queryMock).toHaveBeenCalledWith(expect.not.stringContaining("AND e.period"), [CARRIER])
  })
})
