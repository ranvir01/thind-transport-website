/**
 * hub.documents.uploaded_by is a UUID column, but applySmartScanAction passed
 * the actor's DISPLAY NAME into it — so every Smart Setup apply that attached
 * a file threw "invalid input syntax for type uuid" AFTER creating the
 * customer/truck/driver record: the entity landed, the scanned document
 * silently never did, and the user saw "Could not apply". Pin that the
 * document row is written with the actor's id.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Dana Dispatcher",
    carrierId: "11111111-1111-1111-1111-111111111111",
  })),
}))
vi.mock("@/lib/hub/customers", () => ({ createCustomer: vi.fn() }))
vi.mock("@/lib/hub/drivers", () => ({ createDriver: vi.fn() }))
vi.mock("@/lib/hub/fleet", () => ({ createTruck: vi.fn() }))
vi.mock("@/lib/hub/documents", () => ({ saveDocument: vi.fn(async () => ({ id: "doc-1" })) }))
vi.mock("@/lib/hub/vin", () => ({ decodeVin: vi.fn(async () => null) }))
vi.mock("@/lib/hub/vetting", () => ({ vetCustomer: vi.fn(), fmcsaConfigured: vi.fn(() => false) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { saveDocument } from "@/lib/hub/documents"
import { createDriver } from "@/lib/hub/drivers"
import { logAudit } from "@/lib/hub/audit"
import { applySmartScanAction } from "@/app/hub/_actions/setup"

const saveDocumentMock = vi.mocked(saveDocument)
const createDriverMock = vi.mocked(createDriver)
const logAuditMock = vi.mocked(logAudit)

function formDataFor(kind: string, payload: Record<string, unknown>): FormData {
  const fd = new FormData()
  fd.set("kind", kind)
  fd.set("payload", JSON.stringify(payload))
  fd.set("file", new File(["%PDF"], "w9.pdf", { type: "application/pdf" }))
  return fd
}

beforeEach(() => {
  saveDocumentMock.mockClear()
  createDriverMock.mockReset()
  logAuditMock.mockClear()
  createDriverMock.mockResolvedValue({ id: "driver-1" } as never)
})

describe("applySmartScanAction files documents under the actor's id, not their name", () => {
  it("w9 vault filing passes the user id as uploadedBy", async () => {
    const result = await applySmartScanAction(formDataFor("w9", { expiry: "2027-01-01" }))
    expect(result.ok).toBe(true)
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    const input = saveDocumentMock.mock.calls[0][0]
    expect(input.uploadedBy).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    expect(input.uploadedBy).not.toBe("Dana Dispatcher")
  })
})

describe("applySmartScanAction audits CDL/med-card hire-rate writes", () => {
  it("logs pay_type/pay_rate when a CDL scan creates a driver", async () => {
    const result = await applySmartScanAction(formDataFor("cdl", {
      first_name: "Amar",
      last_name: "Gill",
      cdl_number: "WA123",
    }))
    expect(result.ok).toBe(true)
    expect(createDriverMock).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        pay_type: "per_mile",
        pay_rate: 0.63,
        escrow_weekly_cents: 0,
        insurance_weekly_cents: 0,
      })
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "driver",
        entityId: "driver-1",
        action: "smart_setup_create",
        newValue: expect.objectContaining({
          kind: "cdl",
          pay_type: "per_mile",
          pay_rate: 0.63,
        }),
      })
    )
  })

  it("logs the same hire-rate audit when a med-card scan creates a driver", async () => {
    const result = await applySmartScanAction(formDataFor("med_card", {
      first_name: "Amar",
      last_name: "Gill",
      medical_card_expiry: "2027-06-01",
    }))
    expect(result.ok).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "driver",
        entityId: "driver-1",
        action: "smart_setup_create",
        newValue: expect.objectContaining({ kind: "med_card", pay_rate: 0.63 }),
      })
    )
  })
})
