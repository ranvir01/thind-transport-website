/**
 * updateCompanyProfileAction (src/app/hub/_actions/company.ts) is the first
 * owner-facing edit of the hub.carriers row itself — the name/phone/email/
 * address printed on invoices and settlement PDFs. Pins: owner-only, input
 * validation short-circuits before any DB work, blanks normalize to NULL,
 * the UPDATE is scoped to the owner's own carrier, DOT/MC never appear in
 * the write, and the mutation is audited.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../session", () => ({ requireOwner: vi.fn() }))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { requireOwner } from "../session"
import { query } from "../db"
import { logAudit } from "../audit"
import { updateCompanyProfileAction } from "@/app/hub/_actions/company"

const requireOwnerMock = vi.mocked(requireOwner)
const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const CARRIER_ID = "44444444-4444-4444-4444-444444444444"
const OWNER = { id: "u1", name: "Priya", email: "p@a.com", role: "owner" as const, carrierId: CARRIER_ID }

const INPUT = {
  name: "Thind Transport LLC",
  phone: "(206) 555-0100",
  email: "billing@thind.example",
  address: "1234 Freight Way\nKent, WA 98032",
}

beforeEach(() => {
  requireOwnerMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  logAuditMock.mockReset()
})

describe("updateCompanyProfileAction", () => {
  it("rejects a non-owner without writing anything", async () => {
    requireOwnerMock.mockRejectedValue(new Error("NEXT_REDIRECT"))
    const result = await updateCompanyProfileAction(INPUT)
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("rejects a blank company name before any DB work", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateCompanyProfileAction({ ...INPUT, name: "   " })
    expect(result).toEqual({ ok: false, error: "Company name is required" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("rejects a malformed email before any DB work", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateCompanyProfileAction({ ...INPUT, email: "not-an-email" })
    expect(result).toEqual({ ok: false, error: "That email doesn't look right" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("writes trimmed values scoped to the owner's own carrier and audits", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateCompanyProfileAction({
      ...INPUT,
      name: "  Thind Transport LLC  ",
      phone: " (206) 555-0100 ",
    })
    expect(result).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("UPDATE hub.carriers")
    expect(String(sql)).toContain("WHERE id = $1")
    // DOT/MC are FMCSA-verified at signup — the profile edit must never touch them.
    expect(String(sql)).not.toMatch(/dot_number|mc_number/)
    expect(params).toEqual([
      CARRIER_ID, "Thind Transport LLC", "(206) 555-0100", INPUT.email, INPUT.address,
    ])
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock.mock.calls[0][0]).toMatchObject({
      carrierId: CARRIER_ID, entityType: "carrier", entityId: CARRIER_ID, action: "profile_updated",
    })
  })

  it("normalizes blank phone/email/address to NULL rather than empty strings", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateCompanyProfileAction({
      name: "Thind Transport LLC", phone: "  ", email: "", address: " ",
    })
    expect(result).toEqual({ ok: true })
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual([CARRIER_ID, "Thind Transport LLC", null, null, null])
  })
})
