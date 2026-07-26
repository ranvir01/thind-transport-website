/**
 * Regression coverage (TEST_GAPS.md #9): createLoad/updateLoad were 0% covered
 * despite being where every load's money columns (linehaul_cents,
 * fuel_surcharge_cents, accessorials) are written and where assertCarrierRefs
 * (tenancy.ts) is called. Nothing pinned that the tenancy guard fires before
 * any write, or that a cross-tenant customer/driver/truck/trailer id is
 * rejected instead of silently attaching a load to the wrong carrier's fleet.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("../facilities", () => ({ facilityDedupeKey: vi.fn(() => "dedupe-key") }))

import { hubDb, query } from "../db"
import { assertCarrierRefs } from "../tenancy"
import { createLoad, updateLoad } from "../loads"
import type { LoadInput } from "../loads"

const queryMock = vi.mocked(query)
const hubDbMock = vi.mocked(hubDb)
const assertRefsMock = vi.mocked(assertCarrierRefs)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER_CARRIER_CUSTOMER = "22222222-2222-2222-2222-222222222222"
const ACTOR = { id: "33333333-3333-3333-3333-333333333333", name: "Dispatcher" }

const baseInput: LoadInput = {
  customer_id: OTHER_CARRIER_CUSTOMER,
  equipment: "dry_van",
  linehaul_cents: 240000,
  fuel_surcharge_cents: 10000,
  accessorials: [],
  stops: [
    { type: "pickup", city: "Kent", state: "WA" },
    { type: "delivery", city: "Portland", state: "OR" },
  ],
}

function wireCreateLoadClient() {
  const calls: { sql: string; params: unknown[] }[] = []
  const clientQuery = vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql: String(sql), params })
    const s = String(sql)
    if (/^\s*BEGIN/.test(s) || /^\s*COMMIT/.test(s) || /^\s*ROLLBACK/.test(s)) return { rows: [] }
    if (s.includes("SELECT MAX(SUBSTRING(reference")) return { rows: [{ max_ref: "1000" }] }
    if (s.includes("INSERT INTO hub.loads")) {
      return { rows: [{ id: "load-1", carrier_id: CARRIER, reference: "THD-1001" }] }
    }
    if (s.includes("INSERT INTO hub.stops")) return { rows: [{ id: "stop-1" }] }
    if (s.includes("INSERT INTO hub.load_events")) return { rows: [] }
    return { rows: [] }
  })
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => ({ query: clientQuery, release: vi.fn() })),
  } as unknown as ReturnType<typeof hubDb>)
  return calls
}

describe("createLoad tenancy + money-column integrity (TEST_GAPS.md #9)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    hubDbMock.mockReset()
    assertRefsMock.mockReset()
  })

  it("rejects a cross-tenant customer/driver/truck/trailer id before any INSERT", async () => {
    assertRefsMock.mockRejectedValueOnce(new Error("Customer not found"))
    const calls = wireCreateLoadClient()

    await expect(createLoad(CARRIER, baseInput, ACTOR)).rejects.toThrow("Customer not found")

    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, {
      customer_id: OTHER_CARRIER_CUSTOMER, driver_id: undefined, truck_id: undefined, trailer_id: undefined,
    })
    expect(calls.some((c) => c.sql.includes("INSERT INTO hub.loads"))).toBe(false)
  })

  it("validates refs before writing, then inserts integer-cent money columns scoped to the carrier", async () => {
    assertRefsMock.mockResolvedValueOnce(undefined)
    const calls = wireCreateLoadClient()

    const load = await createLoad(CARRIER, baseInput, ACTOR)

    expect(load.id).toBe("load-1")
    const insertLoad = calls.find((c) => c.sql.includes("INSERT INTO hub.loads"))
    expect(insertLoad).toBeDefined()
    const [carrierIdParam, , , , , , , , linehaulCents, fscCents] = insertLoad!.params as unknown[]
    expect(carrierIdParam).toBe(CARRIER)
    expect(linehaulCents).toBe(240000)
    expect(Number.isInteger(linehaulCents as number)).toBe(true)
    expect(fscCents).toBe(10000)
    expect(Number.isInteger(fscCents as number)).toBe(true)

    const insertStops = calls.filter((c) => c.sql.includes("INSERT INTO hub.stops"))
    expect(insertStops).toHaveLength(2)
    for (const stop of insertStops) expect(stop.params[0]).toBe(CARRIER)

    const insertEvent = calls.find((c) => c.sql.includes("INSERT INTO hub.load_events"))
    expect(insertEvent!.params[0]).toBe(CARRIER)
  })
})

describe("updateLoad tenancy + money-column integrity (TEST_GAPS.md #9)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    assertRefsMock.mockReset()
  })

  const updateInput: Omit<LoadInput, "stops" | "status"> = {
    customer_id: OTHER_CARRIER_CUSTOMER,
    equipment: "dry_van",
    linehaul_cents: 250000,
    fuel_surcharge_cents: 12000,
    accessorials: [],
  }

  it("rejects a cross-tenant ref before issuing the UPDATE", async () => {
    assertRefsMock.mockRejectedValueOnce(new Error("Driver not found"))

    await expect(updateLoad(CARRIER, "load-1", updateInput)).rejects.toThrow("Driver not found")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("scopes the UPDATE to carrier_id + id and writes integer cents", async () => {
    assertRefsMock.mockResolvedValueOnce(undefined)
    queryMock.mockResolvedValueOnce([{ id: "load-1", carrier_id: CARRIER }] as never)

    const result = await updateLoad(CARRIER, "load-1", updateInput)

    expect(result).not.toBeNull()
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain("WHERE carrier_id=$1 AND id=$2 AND deleted_at IS NULL")
    expect(params[0]).toBe(CARRIER)
    expect(params[1]).toBe("load-1")
    const linehaulCents = params[7]
    const fscCents = params[8]
    expect(linehaulCents).toBe(250000)
    expect(Number.isInteger(linehaulCents as number)).toBe(true)
    expect(fscCents).toBe(12000)
    expect(Number.isInteger(fscCents as number)).toBe(true)
  })
})
