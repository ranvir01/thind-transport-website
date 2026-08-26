/**
 * createLoad/updateLoad (loads.ts:212,268) were 35.2%/14.4% stmt/branch
 * covered with zero tests pinning that assertCarrierRefs actually blocks a
 * cross-carrier customer/driver/truck/trailer id before any write
 * (TEST_GAPS.md #9). cross-table-write-guards.test.ts covers incidents,
 * messages, and fleet but not loads. This exercises the real tenancy.ts
 * guard (not mocked) against the real error path.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb, query } from "../db"
import { createLoad, updateLoad, type LoadInput } from "../loads"

const queryMock = vi.mocked(query)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER_CUSTOMER = "22222222-2222-2222-2222-222222222222"
const CUSTOMER = "33333333-3333-3333-3333-333333333333"

const baseInput: LoadInput = {
  customer_id: CUSTOMER,
  equipment: "dry_van",
  linehaul_cents: 240000,
  fuel_surcharge_cents: 10000,
  accessorials: [],
  stops: [],
}

const updateInput = {
  customer_id: CUSTOMER,
  equipment: "dry_van" as const,
  linehaul_cents: 240000,
  fuel_surcharge_cents: 10000,
  accessorials: [],
}

function connectSpy() {
  const calls: { sql: string; params: unknown[] }[] = []
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => ({
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        calls.push({ sql: String(sql), params })
        if (/^\s*BEGIN|^\s*COMMIT|^\s*ROLLBACK/.test(String(sql))) return { rows: [] }
        if (String(sql).includes("INSERT INTO hub.loads")) return { rows: [{ id: "load-1" }] }
        return { rows: [] }
      }),
      release: vi.fn(),
    })),
  } as unknown as ReturnType<typeof hubDb>)
  return calls
}

describe("createLoad / updateLoad — cross-carrier ref guard (TEST_GAPS.md #9)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    hubDbMock.mockReset()
  })

  it("createLoad refuses a customer id belonging to another carrier before any INSERT", async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (String(sql).includes("FROM hub.customers")) {
        const [, id] = params as [string, string]
        return id === CUSTOMER ? [{ id: CUSTOMER }] : []
      }
      return []
    })
    const calls = connectSpy()

    await expect(
      createLoad(CARRIER, { ...baseInput, customer_id: OTHER_CUSTOMER }, { id: "u1", name: "Dispatcher" })
    ).rejects.toThrow("Customer not found")

    expect(hubDbMock).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it("createLoad proceeds and inserts the load when every ref belongs to the carrier", async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (String(sql).includes("FROM hub.customers")) {
        const [, id] = params as [string, string]
        return id === CUSTOMER ? [{ id: CUSTOMER }] : []
      }
      return []
    })
    const calls = connectSpy()

    const load = await createLoad(CARRIER, baseInput, { id: "u1", name: "Dispatcher" })

    expect(load).toEqual({ id: "load-1" })
    const insert = calls.find((c) => c.sql.includes("INSERT INTO hub.loads"))
    expect(insert).toBeDefined()
    expect(insert!.params[0]).toBe(CARRIER)
    expect(insert!.params[3]).toBe(CUSTOMER)
  })

  it("updateLoad refuses a driver id belonging to another carrier before any UPDATE", async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (String(sql).includes("FROM hub.customers")) return [{ id: CUSTOMER }]
      if (String(sql).includes("FROM hub.drivers")) return []
      return []
    })

    await expect(
      updateLoad(CARRIER, "load-1", { ...updateInput, driver_id: "not-this-carriers-driver" })
    ).rejects.toThrow("Driver not found")

    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE hub.loads SET"), expect.anything())
  })
})
