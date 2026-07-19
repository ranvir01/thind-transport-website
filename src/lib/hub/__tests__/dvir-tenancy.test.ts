/**
 * Regression for tenancy holes in the DVIR path (truck subsystem audit):
 *  - submitDvir stored a client-supplied priorDvirId with no ownership check.
 *    A dvir row pointing at ANOTHER CARRIER's report made truckDvirState's
 *    NOT EXISTS treat that carrier's defective post-trip as "reviewed",
 *    hiding its awaiting-repair state cross-tenant.
 *  - The pre-trip release path checked the prior DVIR by id + carrier but not
 *    truck, so a certified repair on truck X could un-ground truck Y.
 *  - DVIR_SELECT joined hub.trucks / hub.drivers by id alone (no join-side
 *    carrier guard), and truckDvirState's reviewing-dvir subquery was
 *    unscoped.
 *  - driverOwnsTruck — the new gate closing the "any driver can file/ground
 *    any truck in the carrier" hole (see dvir-driver-scope.test.ts for the
 *    action-level enforcement).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb, query, queryOne } from "../db"
import { driverOwnsTruck, listDvirsForTruck, submitDvir, truckDvirState } from "../dvir"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "22222222-2222-2222-2222-222222222222"
const TRUCK = "33333333-3333-3333-3333-333333333333"
const PRIOR = "44444444-4444-4444-4444-444444444444"

function makeClient(overrides: { priorRows?: { repair_certified_at: string | null }[] } = {}) {
  const client = {
    query: vi.fn(async (text: string) => {
      const sql = String(text)
      if (sql.includes("SELECT repair_certified_at")) return { rows: overrides.priorRows ?? [] }
      if (sql.includes("INSERT INTO hub.dvirs")) return { rows: [{ id: "dvir-new" }] }
      if (sql.includes("INSERT INTO hub.maintenance_records")) return { rows: [{ id: "wo-1" }] }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) } as never)
  return client
}

function preTripInput(priorDvirId: string | null) {
  return {
    truckId: TRUCK,
    driverId: "driver-1",
    type: "pre" as const,
    checklist: [],
    defects: [],
    safeToOperate: true,
    signature: "data:sig",
    signedName: "Sam Grewal",
    priorDvirId,
  }
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("submitDvir prior-DVIR ownership", () => {
  it("resolves the prior DVIR scoped to this carrier AND this truck", async () => {
    const client = makeClient({ priorRows: [{ repair_certified_at: "2026-07-01T00:00:00Z" }] })

    await submitDvir(CARRIER, preTripInput(PRIOR))

    const lookup = client.query.mock.calls.find(([sql]) => String(sql).includes("SELECT repair_certified_at"))
    expect(lookup).toBeDefined()
    expect(String(lookup![0])).toContain("WHERE id = $1 AND carrier_id = $2 AND truck_id = $3")
    expect(lookup![1]).toEqual([PRIOR, CARRIER, TRUCK])
  })

  it("rejects a prior DVIR the carrier/truck does not own and stores nothing", async () => {
    const client = makeClient({ priorRows: [] })

    await expect(submitDvir(CARRIER, preTripInput(PRIOR))).rejects.toThrow(
      "Prior inspection not found on this truck"
    )

    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.dvirs"))
    expect(insert).toBeUndefined()
    const rollback = client.query.mock.calls.find(([sql]) => String(sql).includes("ROLLBACK"))
    expect(rollback).toBeDefined()
  })

  it("releases the grounded truck only off the validated, certified prior", async () => {
    const client = makeClient({ priorRows: [{ repair_certified_at: "2026-07-01T00:00:00Z" }] })
    await submitDvir(CARRIER, preTripInput(PRIOR))
    const release = client.query.mock.calls.find(([sql]) => String(sql).includes("SET status = 'active'"))
    expect(release).toBeDefined()
    expect(release![1]).toEqual([CARRIER, TRUCK])
  })

  it("does not release the truck when the prior is not yet certified", async () => {
    const client = makeClient({ priorRows: [{ repair_certified_at: null }] })
    await submitDvir(CARRIER, preTripInput(PRIOR))
    const release = client.query.mock.calls.find(([sql]) => String(sql).includes("SET status = 'active'"))
    expect(release).toBeUndefined()
  })
})

describe("driverOwnsTruck", () => {
  it("scopes by carrier AND (assigned driver OR the driver's active-load truck)", async () => {
    await driverOwnsTruck(CARRIER, "driver-1", TRUCK)
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("t.carrier_id = $1 AND t.id = $2")
    expect(String(sql)).toContain("t.assigned_driver_id = $3")
    expect(String(sql)).toContain("l.carrier_id = $1 AND l.driver_id = $3")
    expect(params).toEqual([CARRIER, TRUCK, "driver-1"])
  })
})

describe("DVIR read queries carrier-guard their joins", () => {
  it("dvir list guards the truck and driver joins", async () => {
    await listDvirsForTruck(CARRIER, TRUCK)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON t.id = v.truck_id AND t.carrier_id = v.carrier_id")
    expect(sql).toContain("ON d.id = v.driver_id AND d.carrier_id = v.carrier_id")
  })

  it("truckDvirState only counts same-carrier reviewing dvirs", async () => {
    await truckDvirState(CARRIER, TRUCK)
    const sql = String(queryOneMock.mock.calls[0][0])
    expect(sql).toContain("r.prior_dvir_id = v.id AND r.carrier_id = v.carrier_id")
  })
})
