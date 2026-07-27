/**
 * TEST_GAPS.md #12: computeDriverScores (recruiting.ts) fed the monthly
 * scorecard cron with zero dedicated tests — only mocked out in
 * cron-route.test.ts. The composite formula (70% on-time + 30% MPG-vs-fleet
 * capped at 120%, minus 15pts/incident, clamped 0-100) is what
 * settlements.ts's scorecard_bonus tier lookup reads, so an unnoticed
 * regression here silently mis-scores every driver bonus tier.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { query, queryOne } from "../db"
import { computeDriverScores } from "../recruiting"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const MONTH = "2026-06-01"

type Stats = {
  delivered: number
  on_time: number
  miles: number | null
  gallons: number | null
  incidents: number
}

function wireMocks(opts: {
  fleetMiles: number | null
  fleetGallons: number | null
  drivers: { id: string; stats: Stats }[]
}) {
  queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const s = String(sql)
    if (s.includes("SUM(loaded_miles)") && s.includes("SUM(gallons)") && s.includes("hub.fuel_transactions")) {
      return { miles: opts.fleetMiles?.toString() ?? null, gallons: opts.fleetGallons?.toString() ?? null } as never
    }
    if (s.includes("COUNT(*) FROM hub.stops")) {
      const driverId = params[1]
      const found = opts.drivers.find((d) => d.id === driverId)
      if (!found) return null
      return {
        delivered: String(found.stats.delivered),
        on_time: String(found.stats.on_time),
        miles: found.stats.miles?.toString() ?? null,
        gallons: found.stats.gallons?.toString() ?? null,
        incidents: String(found.stats.incidents),
      } as never
    }
    return null
  })

  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.drivers WHERE carrier_id")) {
      return opts.drivers.map((d) => ({ id: d.id })) as never
    }
    return [] as never
  })
}

function insertedRowFor(driverId: string) {
  const call = queryMock.mock.calls.find(
    ([sql, params]) => String(sql).includes("INSERT INTO hub.driver_scores") && (params as unknown[])?.[1] === driverId
  )
  return call?.[1] as unknown[] | undefined
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
})

describe("computeDriverScores", () => {
  it("computes the composite from 70% on-time + 30% MPG-vs-fleet and upserts it", async () => {
    const DRIVER = "22222222-2222-2222-2222-222222222222"
    wireMocks({
      fleetMiles: 10000,
      fleetGallons: 1600, // fleet MPG = 6.25
      drivers: [{ id: DRIVER, stats: { delivered: 10, on_time: 8, miles: 1250, gallons: 200, incidents: 0 } }],
      // driver MPG = 1250/200 = 6.25 -> ratio vs fleet = 1.0 (uncapped)
    })

    const result = await computeDriverScores(CARRIER, MONTH)
    expect(result).toEqual({ drivers: 1 })

    const row = insertedRowFor(DRIVER)
    expect(row).toBeDefined()
    const [carrierId, driverId, month, onTimePct, mpg, fleetMpg, incidents, delivered, composite] = row!
    expect(carrierId).toBe(CARRIER)
    expect(driverId).toBe(DRIVER)
    expect(month).toBe(MONTH)
    expect(onTimePct).toBe(80) // 8/10 * 100
    expect(mpg).toBe(6.25)
    expect(fleetMpg).toBe(6.25)
    expect(incidents).toBe(0)
    expect(delivered).toBe(10)
    // 80 * 0.7 + (1.0 / 1.2) * 100 * 0.3 - 0 = 56 + 25 = 81
    expect(composite).toBe(81)
  })

  it("skips a driver with zero deliveries and zero incidents — no row written", async () => {
    const DRIVER = "33333333-3333-3333-3333-333333333333"
    wireMocks({
      fleetMiles: 1000,
      fleetGallons: 160,
      drivers: [{ id: DRIVER, stats: { delivered: 0, on_time: 0, miles: null, gallons: null, incidents: 0 } }],
    })

    const result = await computeDriverScores(CARRIER, MONTH)
    expect(result).toEqual({ drivers: 1 })
    expect(insertedRowFor(DRIVER)).toBeUndefined()
  })

  it("still scores a driver with incidents but zero deliveries, treating on-time as 100%", async () => {
    const DRIVER = "44444444-4444-4444-4444-444444444444"
    wireMocks({
      fleetMiles: 1000,
      fleetGallons: 160,
      drivers: [{ id: DRIVER, stats: { delivered: 0, on_time: 0, miles: null, gallons: null, incidents: 2 } }],
    })

    await computeDriverScores(CARRIER, MONTH)
    const row = insertedRowFor(DRIVER)!
    const [, , , onTimePct, mpg, , incidents, delivered, composite] = row
    expect(onTimePct).toBeNull()
    expect(mpg).toBeNull()
    expect(incidents).toBe(2)
    expect(delivered).toBe(0)
    // onTimePct defaults to 100, mpgRatio defaults to 1 (no mpg data):
    // 100 * 0.7 + (1 / 1.2) * 100 * 0.3 - 2 * 15 = 70 + 25 - 30 = 65
    expect(composite).toBe(65)
  })

  it("caps mpgRatio at 1.2 so beating fleet MPG can't push the MPG term past 30 points", async () => {
    const DRIVER = "55555555-5555-5555-5555-555555555555"
    wireMocks({
      fleetMiles: 6000,
      fleetGallons: 1000, // fleet MPG = 6
      drivers: [{ id: DRIVER, stats: { delivered: 5, on_time: 5, miles: 1200, gallons: 100, incidents: 0 } }],
      // driver MPG = 12 -> raw ratio 2.0, capped to 1.2
    })

    await computeDriverScores(CARRIER, MONTH)
    const row = insertedRowFor(DRIVER)!
    const [, , , , , , , , composite] = row
    // 100 * 0.7 + (1.2 / 1.2) * 100 * 0.3 - 0 = 70 + 30 = 100
    expect(composite).toBe(100)
  })

  it("clamps the composite at 0 when incident penalties push it negative", async () => {
    const DRIVER = "66666666-6666-6666-6666-666666666666"
    wireMocks({
      fleetMiles: 1000,
      fleetGallons: 160,
      drivers: [{ id: DRIVER, stats: { delivered: 10, on_time: 10, miles: 500, gallons: 80, incidents: 10 } }],
    })

    await computeDriverScores(CARRIER, MONTH)
    const row = insertedRowFor(DRIVER)!
    const composite = row[8]
    expect(composite).toBe(0)
  })

  it("defaults mpgRatio to 1 when the fleet has no fuel data for the month", async () => {
    const DRIVER = "77777777-7777-7777-7777-777777777777"
    wireMocks({
      fleetMiles: 1000,
      fleetGallons: null, // fleetMpg -> null
      drivers: [{ id: DRIVER, stats: { delivered: 4, on_time: 4, miles: 400, gallons: 50, incidents: 0 } }],
    })

    await computeDriverScores(CARRIER, MONTH)
    const row = insertedRowFor(DRIVER)!
    const [, , , , mpg, fleetMpg, , , composite] = row
    expect(mpg).toBe(8) // driver mpg still computed
    expect(fleetMpg).toBeNull()
    // mpgRatio defaults to 1 since fleetMpg is null: 100*0.7 + (1/1.2)*100*0.3 = 95
    expect(composite).toBe(95)
  })

  it("returns the count of active drivers considered, including ones it skipped", async () => {
    const A = "88888888-8888-8888-8888-888888888888"
    const B = "99999999-9999-9999-9999-999999999999"
    wireMocks({
      fleetMiles: 1000,
      fleetGallons: 160,
      drivers: [
        { id: A, stats: { delivered: 1, on_time: 1, miles: 100, gallons: 16, incidents: 0 } },
        { id: B, stats: { delivered: 0, on_time: 0, miles: null, gallons: null, incidents: 0 } },
      ],
    })

    const result = await computeDriverScores(CARRIER, MONTH)
    expect(result).toEqual({ drivers: 2 })
    expect(insertedRowFor(A)).toBeDefined()
    expect(insertedRowFor(B)).toBeUndefined()
  })
})
