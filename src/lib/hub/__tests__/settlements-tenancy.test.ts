import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({ getCarrier: vi.fn(async () => ({ name: "Demo" })) }))
vi.mock("../documents", () => ({ storeGeneratedPdf: vi.fn(async () => "https://example.com/settlement.pdf") }))
vi.mock("../pdf", () => ({ buildSettlementPdf: vi.fn(async () => new Uint8Array([1])) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(),
  isEmailConfigured: vi.fn(() => false),
  mailFrom: vi.fn(() => "payroll@example.com"),
}))

import { query, queryOne } from "../db"
import { approveSettlement } from "../settlements"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const SETTLEMENT = "22222222-2222-2222-2222-222222222222"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "44444444-4444-4444-4444-444444444444", name: "Test Actor" }

const draftSettlement = {
  id: SETTLEMENT,
  carrier_id: CARRIER,
  driver_id: DRIVER,
  driver_name: "Test Driver",
  pay_type: "percentage" as const,
  status: "draft" as const,
  period_start: "2026-06-01",
  period_end: "2026-06-07",
  gross_cents: 100000,
  deductions_cents: 10000,
  net_cents: 90000,
  statement_url: null,
}

describe("approveSettlement carrier-guards driver read", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
    queryOneMock.mockImplementation(async (sql: string) => {
      const s = String(sql)
      if (s.includes("hub.settlements s JOIN hub.drivers")) return draftSettlement
      if (s.includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")) return { id: DRIVER, email: null }
      return null
    })
    queryMock.mockResolvedValue([])
  })

  it("loads the driver with carrier_id = $2 (not id-only)", async () => {
    await approveSettlement(CARRIER, SETTLEMENT, ACTOR)
    const driverLookup = queryOneMock.mock.calls.find(([sql]) =>
      String(sql).includes("FROM hub.drivers WHERE id = $1 AND carrier_id = $2")
    )
    expect(driverLookup).toBeDefined()
    expect(driverLookup![1]).toEqual([DRIVER, CARRIER])
  })
})
