/**
 * P2.1, second half: draftSettlements selects a driver's loads by status and
 * settlement_id alone. It never asked whether anyone had billed the customer,
 * so the carrier could pay a driver for freight it never invoiced — TOP_10.md
 * #4 measured exactly that on seeded data.
 *
 * Deliberately a flag, not a block: the driver hauled the load and is owed for
 * it. What was missing is that nothing said so.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
  queryOneMock: vi.fn(async () => null),
}))

vi.mock("../db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  hubDb: vi.fn(() => ({
    connect: async () => ({
      query: vi.fn(async () => ({ rows: [{ id: "settle-1" }] })),
      release: vi.fn(),
    }),
  })),
}))
vi.mock("../pay-rules", () => ({
  evaluatePayRules: vi.fn(() => ({
    grossCents: 100000, deductionsCents: 0, netCents: 100000, lines: [],
  })),
  parseRuleSet: vi.fn(() => ({})),
  legacyConfigToRuleSet: vi.fn(() => ({})),
}))
vi.mock("../recruiting", () => ({
  payableReferralBonuses: vi.fn(async () => []),
  latestScorecardScore: vi.fn(async () => null),
}))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { draftSettlements } from "../settlements"

const CARRIER = "carrier-1"
const ACTOR = { id: "u1", name: "Dana" }

const driver = {
  id: "driver-1", first_name: "Harpreet", last_name: "Singh",
  pay_type: "per_mile", pay_rate: 0.6, pay_loaded_miles_only: true,
  escrow_weekly_cents: 0, insurance_weekly_cents: 0,
}

const loadRow = (over: Record<string, unknown> = {}) => ({
  id: "load-1", reference: "THD-1001", linehaul_cents: 200000, fuel_surcharge_cents: 0,
  accessorials: [], loaded_miles: 500, deadhead_miles: 40, stops_count: 2,
  uninvoiced: false, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  queryOneMock.mockResolvedValue(null)
})

/** drivers → loads → reimbursables → advances, in draftSettlements' order. */
function mockRun(loads: unknown[]) {
  queryMock
    .mockResolvedValueOnce([driver])
    .mockResolvedValueOnce(loads)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValue([])
}

describe("draftSettlements uninvoiced guard", () => {
  it("asks the database whether each load was ever invoiced", async () => {
    mockRun([loadRow()])
    await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    const loadsSql = String(queryMock.mock.calls[1][0])
    expect(loadsSql).toContain("NOT EXISTS")
    expect(loadsSql).toContain("FROM hub.invoices i")
    expect(loadsSql).toContain("AS uninvoiced")
    // Tenancy on both sides of the cross-table check.
    expect(loadsSql).toContain("i.carrier_id = hub.loads.carrier_id")
  })

  it("pins the stops_count subquery to the load's carrier (per_stop pay)", async () => {
    mockRun([loadRow()])
    await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    const loadsSql = String(queryMock.mock.calls[1][0])
    // stopsCount feeds pay-rules per_stop extra-stop pay. An id-only COUNT
    // would let a foreign stop row inflate the driver's settlement.
    expect(loadsSql).toContain("FROM hub.stops s")
    expect(loadsSql).toContain("s.load_id = hub.loads.id AND s.carrier_id = hub.loads.carrier_id")
  })

  it("flags a load being paid to a driver that nobody billed", async () => {
    mockRun([loadRow({ uninvoiced: true })])
    const result = await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    expect(result.uninvoiced).toEqual([
      { driverName: "Harpreet Singh", reference: "THD-1001", amountCents: 200000 },
    ])
  })

  it("still creates the settlement — the driver hauled it and is owed", async () => {
    mockRun([loadRow({ uninvoiced: true })])
    const result = await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    expect(result.created).toBe(1)
  })

  it("counts accessorials and fuel surcharge in the flagged amount", async () => {
    mockRun([
      loadRow({
        uninvoiced: true, fuel_surcharge_cents: 25000,
        accessorials: [{ label: "Detention", amount_cents: 12000 }],
      }),
    ])
    const result = await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    expect(result.uninvoiced[0].amountCents).toBe(200000 + 25000 + 12000)
  })

  it("says nothing when every load on the settlement was invoiced", async () => {
    mockRun([loadRow({ uninvoiced: false })])
    const result = await draftSettlements(CARRIER, "2026-01-05", "2026-01-11", ACTOR)
    expect(result.uninvoiced).toEqual([])
  })
})
