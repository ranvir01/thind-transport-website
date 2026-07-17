/**
 * Regression (truck subsystem audit): prior_dvir_id was an unguarded
 * cross-table write. submitDvir inserted the client-supplied priorDvirId
 * with no ownership check, and truckDvirState's "has this defect been
 * reviewed?" NOT EXISTS subquery had no carrier/truck scope — so a DVIR row
 * referencing a foreign DVIR id could suppress another carrier's (or another
 * truck's) open-defect workflow, and a certified DVIR from truck Y could
 * release truck X from the shop (396.13 forgery). Guards now match the
 * assignFuelToLoad both-sides pattern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb, query, queryOne } from "../db"
import { listDvirsForTruck, submitDvir, truckDvirState } from "../dvir"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const TRUCK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const PRIOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

function mockClient(priorRow: { repair_certified_at: string | null } | null) {
  const calls: { sql: string; params: unknown[] }[] = []
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })
      if (/SELECT repair_certified_at FROM hub\.dvirs/.test(sql)) {
        return { rows: priorRow ? [priorRow] : [] }
      }
      if (/INSERT INTO hub\.dvirs/.test(sql)) return { rows: [{ id: "dvir-new" }] }
      if (/INSERT INTO hub\.maintenance_records/.test(sql)) return { rows: [{ id: "wo-1" }] }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  hubDbMock.mockReturnValue({ connect: async () => client } as never)
  return { client, calls }
}

const BASE_INPUT = {
  truckId: TRUCK,
  driverId: "driver-1",
  type: "pre" as const,
  checklist: [],
  defects: [],
  safeToOperate: true,
  signature: "data:image/png;base64,sig",
  signedName: "Test Driver",
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("submitDvir prior_dvir_id tenancy", () => {
  it("rejects a prior DVIR that is not this carrier's on this truck", async () => {
    const { calls } = mockClient(null)
    await expect(
      submitDvir(CARRIER, { ...BASE_INPUT, priorDvirId: PRIOR })
    ).rejects.toThrow(/prior inspection/i)
    expect(calls.some((c) => /INSERT INTO hub\.dvirs/.test(c.sql))).toBe(false)
    expect(calls.some((c) => c.sql === "ROLLBACK")).toBe(true)
  })

  it("scopes the prior lookup by carrier AND truck, then releases the truck", async () => {
    const { calls } = mockClient({ repair_certified_at: "2026-07-01T00:00:00Z" })
    const result = await submitDvir(CARRIER, { ...BASE_INPUT, priorDvirId: PRIOR })
    expect(result.id).toBe("dvir-new")

    const lookup = calls.find((c) => /SELECT repair_certified_at FROM hub\.dvirs/.test(c.sql))
    expect(lookup).toBeDefined()
    expect(lookup!.sql).toMatch(/carrier_id = \$2 AND truck_id = \$3/)
    expect(lookup!.params).toEqual([PRIOR, CARRIER, TRUCK])

    const release = calls.find((c) => /SET status = 'active'/.test(c.sql))
    expect(release).toBeDefined()
    expect(release!.sql).toContain("WHERE carrier_id = $1 AND id = $2 AND status = 'shop'")
    expect(calls.some((c) => c.sql === "COMMIT")).toBe(true)
  })

  it("skips the release when the prior DVIR is not repair-certified", async () => {
    const { calls } = mockClient({ repair_certified_at: null })
    await submitDvir(CARRIER, { ...BASE_INPUT, priorDvirId: PRIOR })
    expect(calls.some((c) => /SET status = 'active'/.test(c.sql))).toBe(false)
  })
})

describe("DVIR read queries are carrier-guarded on both sides", () => {
  it("truckDvirState's review-check subquery is carrier- and truck-scoped", async () => {
    await truckDvirState(CARRIER, TRUCK)
    const sql = String(queryOneMock.mock.calls[0][0])
    expect(sql).toContain("r.prior_dvir_id = v.id")
    expect(sql).toContain("r.carrier_id = v.carrier_id")
    expect(sql).toContain("r.truck_id = v.truck_id")
  })

  it("DVIR list joins guard truck and driver by carrier", async () => {
    await listDvirsForTruck(CARRIER, TRUCK)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON t.id = v.truck_id AND t.carrier_id = v.carrier_id")
    expect(sql).toContain("ON d.id = v.driver_id AND d.carrier_id = v.carrier_id")
  })
})
