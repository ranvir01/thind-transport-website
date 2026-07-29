/**
 * P3.1: hub.pay_rules was fully modelled and pay-rules-db.ts read and wrote it,
 * but no screen existed — so a driver's pay could only be expressed through the
 * two simple fields on the driver form.
 *
 * savePayRulesAction is where a browser payload becomes what a person is paid,
 * so the sanitiser is the part worth pinning: every amount re-parsed to an
 * integer, anything unrecognised dropped rather than stored, and tenancy
 * checked on the driver id before a single row is written.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryOneMock, saveMock, resetMock, auditMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  saveMock: vi.fn(async (..._args: unknown[]) => ({ id: "rule-1" })),
  resetMock: vi.fn(async () => undefined),
  auditMock: vi.fn(async () => undefined),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "u1", name: "Dana", email: "o@t.test", role: "owner", carrierId: "carrier-1",
  })),
}))
vi.mock("@/lib/hub/db", () => ({ queryOne: queryOneMock, query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/pay-rules-db", () => ({
  savePayRuleSet: saveMock,
  resetPayRulesToAuto: resetMock,
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: auditMock }))

import { requirePermission } from "@/lib/hub/session"
import { savePayRulesAction, resetPayRulesAction } from "@/app/hub/_actions/pay-rules"

const requirePermissionMock = vi.mocked(requirePermission)
const driverRow = { id: "driver-1", name: "Harpreet Singh" }

beforeEach(() => {
  vi.clearAllMocks()
  queryOneMock.mockResolvedValue(driverRow)
  saveMock.mockResolvedValue({ id: "rule-1" })
  requirePermissionMock.mockResolvedValue({
    id: "u1", name: "Dana", email: "o@t.test", role: "owner", carrierId: "carrier-1",
  })
})

/** The PayRuleSet the action actually handed to the db layer. */
const savedRuleSet = () => {
  const call = saveMock.mock.calls[0]
  if (!call) throw new Error("savePayRuleSet was never called")
  return call[2] as import("@/lib/hub/pay-rules").PayRuleSet
}

describe("savePayRulesAction — gate and tenancy", () => {
  it("requires drivers:write, the same authority the driver form needs", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional", rules: [{ type: "per_mile", rateCentsPerMile: 62 }], deductions: [],
    })
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
  })

  it("refuses a driver id from another carrier and writes nothing", async () => {
    queryOneMock.mockResolvedValue(null)
    const result = await savePayRulesAction("driver-from-carrier-b", {
      name: "Regional", rules: [{ type: "per_mile", rateCentsPerMile: 62 }], deductions: [],
    })
    expect(result.ok).toBe(false)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it("scopes the driver lookup to the caller's carrier", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional", rules: [{ type: "per_mile", rateCentsPerMile: 62 }], deductions: [],
    })
    expect(queryOneMock.mock.calls[0][1]).toEqual(["carrier-1", "driver-1"])
  })

  it("refuses a program with no earning rule rather than saving a set that pays nothing", async () => {
    const result = await savePayRulesAction("driver-1", { name: "Empty", rules: [], deductions: [] })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/at least one earning rule/)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it("refuses an unnamed program", async () => {
    const result = await savePayRulesAction("driver-1", {
      name: "   ", rules: [{ type: "per_mile", rateCentsPerMile: 62 }], deductions: [],
    })
    expect(result.ok).toBe(false)
    expect(saveMock).not.toHaveBeenCalled()
  })
})

describe("savePayRulesAction — the sanitiser", () => {
  it("keeps a well-formed per-mile rule verbatim", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional",
      rules: [{ type: "per_mile", rateCentsPerMile: 62, loadedOnly: true }],
      deductions: [],
    })
    expect(savedRuleSet().rules).toEqual([{ type: "per_mile", rateCentsPerMile: 62, loadedOnly: true }])
  })

  it("drops a fractional cent rather than storing a float in a money field", async () => {
    // AGENTS.md: money is integer cents. 62.5c/mile has no representation, and
    // silently rounding it would pay a rate nobody typed.
    const result = await savePayRulesAction("driver-1", {
      name: "Regional",
      rules: [
        { type: "per_mile", rateCentsPerMile: 62.5 },
        { type: "per_mile", rateCentsPerMile: 62 },
      ],
      deductions: [],
    })
    expect(result.ok).toBe(true)
    expect(result.rejected).toBe(1)
    expect(savedRuleSet().rules).toHaveLength(1)
  })

  it("drops negative amounts", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional",
      rules: [{ type: "per_mile", rateCentsPerMile: -50 }, { type: "flat_per_load", amountCents: 5000 }],
      deductions: [],
    })
    expect(savedRuleSet().rules).toEqual([{ type: "flat_per_load", amountCents: 5000 }])
  })

  it("drops an unrecognised rule type instead of storing it", async () => {
    // parseRuleSet would drop it on read anyway; a rule that vanishes between
    // saving and settling is worse than one refused at the door.
    const result = await savePayRulesAction("driver-1", {
      name: "Regional",
      rules: [{ type: "free_money", amountCents: 999999 }, { type: "per_mile", rateCentsPerMile: 62 }],
      deductions: [],
    })
    expect(result.rejected).toBe(1)
    expect(savedRuleSet().rules).toEqual([{ type: "per_mile", rateCentsPerMile: 62, loadedOnly: false }])
  })

  it("caps a percentage at 200% so a typo cannot pay 900x", async () => {
    await savePayRulesAction("driver-1", {
      name: "OO",
      rules: [{ type: "percent_linehaul", basisPoints: 900000 }, { type: "percent_linehaul", basisPoints: 8800 }],
      deductions: [],
    })
    expect(savedRuleSet().rules).toEqual([{ type: "percent_linehaul", basisPoints: 8800 }])
  })

  it("keeps per-stop pay with its free-stop threshold", async () => {
    await savePayRulesAction("driver-1", {
      name: "Multi-stop",
      rules: [{ type: "per_stop", amountCents: 2500, afterStops: 2 }],
      deductions: [],
    })
    expect(savedRuleSet().rules).toEqual([{ type: "per_stop", amountCents: 2500, afterStops: 2 }])
  })

  it("keeps escrow and insurance deductions, drops an unlabelled flat one", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional",
      rules: [{ type: "per_mile", rateCentsPerMile: 62 }],
      deductions: [
        { kind: "escrow", amountCents: 5000 },
        { kind: "flat_recurring", amountCents: 2500 },
        { kind: "flat_recurring", amountCents: 2500, label: "Trailer rent" },
        { kind: "percent_of_gross", basisPoints: 300, label: "Admin" },
      ],
    })
    expect(savedRuleSet().deductions).toEqual([
      { kind: "escrow", amountCents: 5000 },
      { kind: "flat_recurring", amountCents: 2500, label: "Trailer rent" },
      { kind: "percent_of_gross", basisPoints: 300, label: "Admin" },
    ])
  })

  it("never lets a custom program take an auto name, which sync would clobber", async () => {
    await savePayRulesAction("driver-1", {
      name: "Company per-mile",
      rules: [{ type: "per_mile", rateCentsPerMile: 62 }],
      deductions: [],
    })
    expect(savedRuleSet().name).toBe("Company per-mile")
    // savePayRuleSet itself renames; assert the action passed it through so the
    // rename stays in one place rather than being duplicated here.
    expect(saveMock).toHaveBeenCalledWith("carrier-1", "driver-1", expect.any(Object))
  })

  it("audits the save with the driver and the resulting program", async () => {
    await savePayRulesAction("driver-1", {
      name: "Regional", rules: [{ type: "per_mile", rateCentsPerMile: 62 }], deductions: [],
    })
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "pay_rule", action: "save", carrierId: "carrier-1" })
    )
  })
})

describe("resetPayRulesAction", () => {
  it("requires drivers:write", async () => {
    queryOneMock.mockResolvedValue({
      id: "driver-1", name: "Harpreet Singh", pay_type: "per_mile", pay_rate: "0.62",
      pay_loaded_miles_only: true, escrow_weekly_cents: 5000, insurance_weekly_cents: 0,
    })
    await resetPayRulesAction("driver-1")
    expect(requirePermissionMock).toHaveBeenCalledWith("drivers:write")
  })

  it("re-syncs from the driver's own pay fields, so nobody is left with no program", async () => {
    queryOneMock.mockResolvedValue({
      id: "driver-1", name: "Harpreet Singh", pay_type: "per_mile", pay_rate: "0.62",
      pay_loaded_miles_only: true, escrow_weekly_cents: 5000, insurance_weekly_cents: 2500,
    })
    await resetPayRulesAction("driver-1")
    expect(resetMock).toHaveBeenCalledWith("carrier-1", "driver-1", {
      payType: "per_mile", payRate: 0.62, payLoadedMilesOnly: true,
      escrowWeeklyCents: 5000, insuranceWeeklyCents: 2500,
    })
  })

  it("refuses another carrier's driver", async () => {
    queryOneMock.mockResolvedValue(null)
    const result = await resetPayRulesAction("driver-x")
    expect(result.ok).toBe(false)
    expect(resetMock).not.toHaveBeenCalled()
  })
})
