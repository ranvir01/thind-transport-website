/**
 * Regression (1c tenancy audit, 2026-07-26): notifyRandomTestPool's status
 * UPDATE matched hub.random_test_events by id alone. The ids come from a
 * carrier-scoped SELECT so it wasn't exploitable, but house doctrine puts the
 * carrier filter on the UPDATE itself (defense-in-depth, same class as the
 * settlements/advances filters added in the 2026-07-06 audit).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../settings", () => ({ getCarrierSettings: vi.fn(async () => ({})) }))
vi.mock("../notify", () => ({ notifyDriver: vi.fn(async () => undefined) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "../db"
import { notifyRandomTestPool } from "../random-testing"

const queryMock = vi.mocked(query)

beforeEach(() => {
  queryMock.mockReset()
})

describe("notifyRandomTestPool", () => {
  it("carrier-scopes the notified-status UPDATE, not just the SELECT", async () => {
    queryMock.mockResolvedValueOnce([{ id: "ev-1", driver_id: "d-1" }] as never)
    queryMock.mockResolvedValue([] as never)

    await notifyRandomTestPool("carrier-1", "drug", "2026-Q3")

    const update = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE hub.random_test_events SET status = 'notified'")
    )
    expect(update).toBeTruthy()
    expect(String(update![0])).toContain("WHERE id = $1 AND carrier_id = $2")
    expect(update![1]).toEqual(["ev-1", "carrier-1"])
  })
})
