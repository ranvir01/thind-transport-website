/**
 * Regression (1c tenancy audit, 2026-07-26): getDwellingStops joined
 * hub.loads on the FK alone (`l.id = s.load_id`) with no carrier equality —
 * the one join in this subsystem relying on stop-write invariants instead of
 * a JOIN clause. A corrupt stop row pointing at a foreign load would have
 * leaked that carrier's load reference into this carrier's dispatch board
 * and detention alerts. Same defense-in-depth class as ackReport's fix.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../settings", () => ({
  getCarrierSettings: vi.fn(async () => ({
    detention: { freeHours: 2, ratePerHourCents: 5000 },
  })),
}))

import { query } from "../db"
import { getDwellingStops } from "../detention"

const queryMock = vi.mocked(query)

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("getDwellingStops", () => {
  it("pins carrier_id on both sides of the loads join", async () => {
    await getDwellingStops("carrier-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = s.carrier_id")
    expect(String(sql)).toContain("s.carrier_id = $1")
    expect(params).toEqual(["carrier-1"])
  })
})
