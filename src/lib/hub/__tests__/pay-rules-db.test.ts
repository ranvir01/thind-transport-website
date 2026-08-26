/**
 * pay-rules-db.ts had zero test coverage (TEST_GAPS.md #5): `syncDefaultPayRules`'s
 * `if (custom) return` at :32 is the only thing stopping a routine driver-pay-form
 * save from clobbering a hand-built pay program, and `getActivePayRules`'s
 * `ORDER BY (name = ANY($3)) ASC` at :73 is the only thing making a custom rule set
 * outrank the auto-generated one when both exist. Both are one-token-fragile and,
 * until now, unasserted.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => undefined),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { queryOne, query } from "../db"
import { getActivePayRules, syncDefaultPayRules } from "../pay-rules-db"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "22222222-2222-2222-2222-222222222222"

const config = {
  payType: "per_mile" as const,
  payRate: 0.63,
  payLoadedMilesOnly: true,
  escrowWeeklyCents: 5000,
  insuranceWeeklyCents: 3000,
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
})

describe("syncDefaultPayRules — never clobbers a hand-built pay program", () => {
  it("issues zero writes when a custom-named active rule set owns the driver", async () => {
    queryOneMock.mockImplementation(async (sql: string) =>
      String(sql).includes("NOT (name = ANY($3))") ? { id: "custom-1" } : null
    )

    await syncDefaultPayRules(CARRIER, DRIVER, config)

    expect(queryMock).not.toHaveBeenCalled()
  })

  it("updates the existing auto rule set in place when no custom program exists", async () => {
    queryOneMock.mockImplementation(async (sql: string) => {
      const s = String(sql)
      if (s.includes("NOT (name = ANY($3))")) return null
      if (s.includes("name = ANY($3)")) return { id: "auto-1" }
      return null
    })

    await syncDefaultPayRules(CARRIER, DRIVER, config)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("UPDATE hub.pay_rules")
    expect(params).toEqual([
      "auto-1",
      CARRIER,
      "Company per-mile",
      JSON.stringify([
        { type: "per_mile", rateCentsPerMile: 63, loadedOnly: true },
        { type: "referral_bonus" },
      ]),
      JSON.stringify([
        { kind: "escrow", amountCents: 5000 },
        { kind: "insurance", amountCents: 3000 },
      ]),
    ])
  })

  it("inserts a fresh auto rule set when the driver has neither a custom nor an auto row", async () => {
    queryOneMock.mockResolvedValue(null)

    await syncDefaultPayRules(CARRIER, DRIVER, config)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.pay_rules")
    expect(params?.[0]).toBe(CARRIER)
    expect(params?.[1]).toBe(DRIVER)
    expect(params?.[2]).toBe("Company per-mile")
  })
})

describe("getActivePayRules — custom always outranks auto", () => {
  it("returns the custom row when both a custom and an auto rule set are active", async () => {
    queryOneMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      expect(String(sql)).toContain("ORDER BY (name = ANY($3)) ASC, updated_at DESC")
      expect(params).toEqual([CARRIER, DRIVER, ["Company per-mile", "Owner-operator percentage"]])
      // The DB applies the ORDER BY; the fake just returns what a correctly
      // ordered LIMIT 1 would — the custom-named row.
      return {
        id: "custom-1", driver_id: DRIVER, name: "Scorecard bonus tier",
        active: true, rules: [{ type: "percent_linehaul", basisPoints: 9000 }], deductions: [],
      }
    })

    const result = await getActivePayRules(CARRIER, DRIVER)

    expect(result).toMatchObject({ id: "custom-1", isAuto: false })
  })

  it("flags an auto-named row as isAuto when it is the only active rule set", async () => {
    queryOneMock.mockResolvedValue({
      id: "auto-1", driver_id: DRIVER, name: "Company per-mile",
      active: true, rules: [], deductions: [],
    })

    const result = await getActivePayRules(CARRIER, DRIVER)

    expect(result).toMatchObject({ id: "auto-1", isAuto: true })
  })

  it("returns null when the driver has no active rule set", async () => {
    queryOneMock.mockResolvedValue(null)

    const result = await getActivePayRules(CARRIER, DRIVER)

    expect(result).toBeNull()
  })
})
