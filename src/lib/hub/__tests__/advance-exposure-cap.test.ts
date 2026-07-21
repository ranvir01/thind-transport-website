/**
 * createAdvance had no cap at all on a driver's outstanding+pending exposure —
 * a dispatcher could issue an unbounded stack of advances to the same driver.
 * (advances/driver-app pay reads follow-up to the 0312f1b5 settlements audit.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => [{ id: "advance-1" }]),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Demo" })),
  getCarrierSettings: vi.fn(async () => ({ branding: { accent: null } })),
}))
vi.mock("../documents", () => ({ storeGeneratedPdf: vi.fn(async () => "https://example.com/settlement.pdf") }))
vi.mock("../pdf", () => ({ buildSettlementPdf: vi.fn(async () => new Uint8Array([1])) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(),
  isEmailConfigured: vi.fn(() => false),
  mailFrom: vi.fn(() => "payroll@example.com"),
}))

import { query, queryOne } from "../db"
import { createAdvance } from "../settlements"
import { MAX_DRIVER_ADVANCE_EXPOSURE_CENTS } from "../advances-core"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "44444444-4444-4444-4444-444444444444", name: "Test Actor" }

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  // assertCarrierRefs' driver lookup.
  queryMock.mockImplementation(async (sql: string) => {
    if (String(sql).includes("FROM hub.drivers")) return [{ id: DRIVER }]
    if (String(sql).includes("INSERT INTO hub.advances")) return [{ id: "advance-1" }]
    return []
  })
})

describe("createAdvance — carrier-scoped exposure cap", () => {
  it("allows an advance that stays within the cap", async () => {
    queryOneMock.mockResolvedValue({ cents: 0 })
    await expect(
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    ).resolves.toBeUndefined()
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.advances"))
    expect(insert).toBeDefined()
  })

  it("rejects an advance that would push the driver's exposure past the cap", async () => {
    queryOneMock.mockResolvedValue({ cents: MAX_DRIVER_ADVANCE_EXPOSURE_CENTS - 100 })
    await expect(
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    ).rejects.toThrow(/advance exposure/i)
    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.advances"))
    expect(insert).toBeUndefined()
  })

  it("scopes the exposure lookup by carrier AND driver, counting outstanding + pending only", async () => {
    queryOneMock.mockResolvedValue({ cents: 0 })
    await createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    const exposureCall = queryOneMock.mock.calls.find(([sql]) => String(sql).includes("SUM(amount_cents)"))
    expect(exposureCall).toBeDefined()
    expect(String(exposureCall![0])).toContain("carrier_id = $1 AND driver_id = $2")
    expect(String(exposureCall![0])).toContain("status IN ('outstanding', 'pending')")
    expect(exposureCall![1]).toEqual([CARRIER, DRIVER])
  })
})
