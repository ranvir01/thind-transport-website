/**
 * Detention auto-alert: addDetentionAction only bills a stop once it has
 * departed — this covers the "still sitting right now" gap. Regression
 * targets: the hours-over math must match detentionCents exactly, and a
 * dwell episode must only ever alert once (idempotent against load_events).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, addLoadEvent, notifyRoles } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  addLoadEvent: vi.fn(async () => undefined),
  notifyRoles: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: vi.fn(async () => null) }))
vi.mock("../settings", () => ({
  getCarrierSettings: vi.fn(async () => ({
    detention: { freeHours: 2, ratePerHourCents: 6000 },
  })),
}))
vi.mock("../loads", () => ({ addLoadEvent }))
vi.mock("../notify", () => ({ notifyRoles }))

import { getDwellingStops, runDetentionAlerts } from "../detention"

const FOUR_HOURS_AGO = new Date(Date.now() - 4 * 3600000).toISOString()
const ONE_HOUR_AGO = new Date(Date.now() - 1 * 3600000).toISOString()

const DWELLING_ROW = {
  stop_id: "stop-1", load_id: "load-1", load_reference: "THD-1001",
  city: "Kent", state: "WA", type: "delivery", arrived_at: FOUR_HOURS_AGO,
}
const WITHIN_FREE_TIME_ROW = {
  stop_id: "stop-2", load_id: "load-2", load_reference: "THD-1002",
  city: "Boise", state: "ID", type: "pickup", arrived_at: ONE_HOUR_AGO,
}

describe("getDwellingStops", () => {
  beforeEach(() => queryMock.mockReset())

  it("computes hours-over and estimated cents matching detentionCents exactly", async () => {
    queryMock.mockResolvedValue([DWELLING_ROW])
    const [stop] = await getDwellingStops("carrier-1")
    // 4h dwell - 2h free = 2h billable @ $60/hr = $120.00
    expect(stop.hoursOver).toBeCloseTo(2, 1)
    expect(stop.estimatedCents).toBe(12000)
  })

  it("excludes stops still within free time", async () => {
    queryMock.mockResolvedValue([WITHIN_FREE_TIME_ROW])
    const stops = await getDwellingStops("carrier-1")
    expect(stops).toHaveLength(0)
  })
})

describe("runDetentionAlerts", () => {
  beforeEach(() => {
    queryMock.mockReset()
    addLoadEvent.mockClear()
    notifyRoles.mockClear()
  })

  it("alerts once and logs a load event for a fresh dwell episode", async () => {
    // First call (inside getDwellingStops) returns the dwelling row; second
    // call is the "already alerted?" check — empty means not yet alerted.
    queryMock.mockImplementation(async (sql) =>
      sql.includes("FROM hub.stops") ? [DWELLING_ROW] : []
    )
    const result = await runDetentionAlerts("carrier-1")
    expect(result).toEqual({ checked: 1, alerted: 1 })
    expect(addLoadEvent).toHaveBeenCalledTimes(1)
    expect(addLoadEvent).toHaveBeenCalledWith(
      "carrier-1", "load-1", "exception",
      expect.objectContaining({ type: "detention_alert", stopId: "stop-1" }),
      expect.anything()
    )
    expect(notifyRoles).toHaveBeenCalledTimes(1)
    expect(notifyRoles).toHaveBeenCalledWith(
      "carrier-1", ["dispatcher", "owner"],
      expect.objectContaining({ kind: "detention_alert", link: "/hub/loads/load-1" })
    )
  })

  it("skips a stop already alerted for this dwell episode", async () => {
    queryMock.mockImplementation(async (sql) =>
      sql.includes("FROM hub.stops") ? [DWELLING_ROW] : [{ "?column?": 1 }]
    )
    const result = await runDetentionAlerts("carrier-1")
    expect(result).toEqual({ checked: 1, alerted: 0 })
    expect(addLoadEvent).not.toHaveBeenCalled()
    expect(notifyRoles).not.toHaveBeenCalled()
  })
})
