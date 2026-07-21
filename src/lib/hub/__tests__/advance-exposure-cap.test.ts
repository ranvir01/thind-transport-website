/**
 * createAdvance had no cap at all on a driver's outstanding+pending exposure —
 * a dispatcher could issue an unbounded stack of advances to the same driver.
 * (advances/driver-app pay reads follow-up to the 0312f1b5 settlements audit.)
 *
 * The cap check was later found to be a pre-check, not atomic with the INSERT
 * (same TOCTOU shape as the invoice double-booking race fixed in 5e4175b):
 * two concurrent advance requests for the same driver could both read the same
 * pre-insert exposure and both pass the cap. createAdvance now runs the
 * read+insert inside a per-driver `pg_advisory_xact_lock` transaction (same
 * pattern as approveSettlement's escrow-ledger fix) — the fake client below
 * simulates that lock so the concurrency test exercises real serialization.
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

import { hubDb, query } from "../db"
import { createAdvance } from "../settlements"
import { MAX_DRIVER_ADVANCE_EXPOSURE_CENTS } from "../advances-core"

const queryMock = vi.mocked(query)
const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DRIVER = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "44444444-4444-4444-4444-444444444444", name: "Test Actor" }

/**
 * Fake `hubDb().connect()` client for the exposure read+insert transaction:
 * an advisory-lock mutex per driver_id (simulating `pg_advisory_xact_lock`)
 * guards a live SUM read + insert against a shared `exposure` map, so
 * concurrency tests exercise the real serialization instead of asserting on
 * SQL text alone.
 */
function makeFakeAdvancesClient(exposure: Map<string, number>) {
  const calls: { sql: string; params: unknown[] }[] = []
  const locks = new Map<string, { locked: boolean; waiters: (() => void)[] }>()
  function acquire(id: string): Promise<void> {
    let lock = locks.get(id)
    if (!lock) { lock = { locked: false, waiters: [] }; locks.set(id, lock) }
    if (!lock.locked) { lock.locked = true; return Promise.resolve() }
    return new Promise((resolve) => lock!.waiters.push(resolve))
  }
  function release(id: string) {
    const lock = locks.get(id)
    if (!lock) return
    const next = lock.waiters.shift()
    if (next) next(); else lock.locked = false
  }
  hubDbMock.mockReturnValue({
    connect: vi.fn(async () => {
      let held: string | null = null
      return {
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
          calls.push({ sql: String(sql), params })
          const s = String(sql)
          if (/^\s*BEGIN/.test(s)) return { rows: [] }
          if (/^\s*(COMMIT|ROLLBACK)/.test(s)) { if (held) release(held); held = null; return { rows: [] } }
          if (s.includes("pg_advisory_xact_lock")) {
            const [driverId] = params as [string]
            await acquire(driverId)
            held = driverId
            return { rows: [] }
          }
          if (s.includes("SUM(amount_cents)")) {
            const [, driverId] = params as [string, string]
            return { rows: [{ cents: exposure.get(driverId) ?? 0 }] }
          }
          if (s.includes("INSERT INTO hub.advances")) {
            const [, driverId, amountCents] = params as [string, string, number]
            exposure.set(driverId, (exposure.get(driverId) ?? 0) + amountCents)
            return { rows: [{ id: `advance-${calls.length}` }] }
          }
          return { rows: [] }
        }),
        release: vi.fn(),
      }
    }),
  } as unknown as ReturnType<typeof hubDb>)
  return calls
}

beforeEach(() => {
  queryMock.mockReset()
  hubDbMock.mockReset()
  // assertCarrierRefs' driver lookup — goes through the module-level `query`,
  // not the transaction client.
  queryMock.mockImplementation(async (sql: string) => {
    if (String(sql).includes("FROM hub.drivers")) return [{ id: DRIVER }]
    return []
  })
})

describe("createAdvance — carrier-scoped exposure cap", () => {
  it("allows an advance that stays within the cap", async () => {
    const exposure = new Map([[DRIVER, 0]])
    const calls = makeFakeAdvancesClient(exposure)
    await expect(
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    ).resolves.toBeUndefined()
    expect(calls.some((c) => c.sql.includes("INSERT INTO hub.advances"))).toBe(true)
    expect(exposure.get(DRIVER)).toBe(50000)
  })

  it("rejects an advance that would push the driver's exposure past the cap", async () => {
    const exposure = new Map([[DRIVER, MAX_DRIVER_ADVANCE_EXPOSURE_CENTS - 100]])
    const calls = makeFakeAdvancesClient(exposure)
    await expect(
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    ).rejects.toThrow(/advance exposure/i)
    expect(calls.some((c) => c.sql.includes("INSERT INTO hub.advances"))).toBe(false)
  })

  it("scopes the exposure lookup by carrier AND driver, counting outstanding + pending only", async () => {
    const exposure = new Map([[DRIVER, 0]])
    const calls = makeFakeAdvancesClient(exposure)
    await createAdvance(CARRIER, { driverId: DRIVER, amountCents: 50000, issuedOn: "2026-07-21" }, ACTOR)
    const exposureCall = calls.find((c) => c.sql.includes("SUM(amount_cents)"))
    expect(exposureCall).toBeDefined()
    expect(exposureCall!.sql).toContain("carrier_id = $1 AND driver_id = $2")
    expect(exposureCall!.sql).toContain("status IN ('outstanding', 'pending')")
    expect(exposureCall!.params).toEqual([CARRIER, DRIVER])
  })

  it("concurrent advances for the same driver serialize the exposure check instead of racing", async () => {
    // Two office-issued advances for the same driver at once (a double-click,
    // or two staff members acting together). Before the advisory lock, both
    // transactions would read exposure = 0 and both pass a cap of 150000 with
    // an 80000 request each, landing the driver at 160000 total.
    const exposure = new Map([[DRIVER, 0]])
    makeFakeAdvancesClient(exposure)
    const results = await Promise.allSettled([
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 80000, issuedOn: "2026-07-21" }, ACTOR),
      createAdvance(CARRIER, { driverId: DRIVER, amountCents: 80000, issuedOn: "2026-07-21" }, ACTOR),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1)
    expect(exposure.get(DRIVER)).toBe(80000)
  })
})
