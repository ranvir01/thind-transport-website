/**
 * Regression: driverStopTimestamp verified the *load* belonged to the driver
 * (driverOwnsLoad) but setStopTimestamp itself only guarded stopId by
 * carrier_id, not by load_id — so a driver could pass a stopId belonging to
 * an unrelated load (their own or another driver's) alongside their own
 * loadId and silently rewrite that stop's arrival/departure time. (1c audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { setStopTimestamp } from "../loads"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const STOP = "22222222-2222-2222-2222-222222222222"
const LOAD = "33333333-3333-3333-3333-333333333333"

describe("setStopTimestamp", () => {
  beforeEach(() => queryMock.mockClear())

  it("scopes the UPDATE by load_id in addition to carrier_id", async () => {
    await setStopTimestamp(CARRIER, STOP, LOAD, "arrived_at", "2026-07-06T12:00:00Z")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE id = $2 AND load_id = $3 AND carrier_id = $1")
    expect(params).toEqual([CARRIER, STOP, LOAD, "2026-07-06T12:00:00Z"])
  })
})
