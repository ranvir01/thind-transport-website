/**
 * updateOfficeEmailAction (src/app/hub/_actions/company.ts) is the owner
 * edit of notifications.officeEmail — the address that receives the weekly
 * owner digest, compliance expiry alerts, and 20-day overdue-invoice CCs.
 * Pins: owner-only, malformed email short-circuits before any DB work,
 * a set writes a carrier-scoped upsert with the trimmed/lowercased value,
 * blank deletes the key (never stores ""), and both paths are audited.
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
import { updateOfficeEmailAction } from "@/app/hub/_actions/company"

const requireOwnerMock = vi.mocked(requireOwner)
const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const CARRIER_ID = "44444444-4444-4444-4444-444444444444"
const OWNER = { id: "u1", name: "Priya", email: "p@a.com", role: "owner" as const, carrierId: CARRIER_ID }

beforeEach(() => {
  requireOwnerMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  logAuditMock.mockReset()
})

describe("updateOfficeEmailAction", () => {
  it("rejects a non-owner without writing anything", async () => {
    requireOwnerMock.mockRejectedValue(new Error("NEXT_REDIRECT"))
    const result = await updateOfficeEmailAction("office@example.com")
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("rejects a malformed email before any DB work", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateOfficeEmailAction("not-an-email")
    expect(result).toEqual({ ok: false, error: "That email doesn't look right" })
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("upserts the trimmed, lowercased email scoped to the owner's carrier and audits", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateOfficeEmailAction("  Office@Example.COM ")
    expect(result).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("ON CONFLICT (carrier_id)")
    expect(String(sql)).toContain("'{notifications,officeEmail}'")
    expect(params).toEqual([CARRIER_ID, "office@example.com"])
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock.mock.calls[0][0]).toMatchObject({
      carrierId: CARRIER_ID, entityType: "carrier", entityId: CARRIER_ID,
      action: "notifications_updated", newValue: { officeEmail: "office@example.com" },
    })
  })

  it("blank input deletes the key (emails off) instead of storing an empty string", async () => {
    requireOwnerMock.mockResolvedValue(OWNER)
    const result = await updateOfficeEmailAction("   ")
    expect(result).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("#- '{notifications,officeEmail}'")
    expect(String(sql)).toContain("WHERE carrier_id = $1")
    expect(params).toEqual([CARRIER_ID])
    expect(logAuditMock.mock.calls[0][0]).toMatchObject({
      action: "notifications_updated", newValue: { officeEmail: null },
    })
  })
})
