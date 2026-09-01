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

import { requirePermission } from "@/lib/hub/session"
import { saveDocument } from "@/lib/hub/documents"
import { createDriver } from "@/lib/hub/drivers"
import { createTruck } from "@/lib/hub/fleet"
import { logAudit } from "@/lib/hub/audit"
import { applySmartScanAction } from "@/app/hub/_actions/setup"

const ACTOR = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  name: "Dana Dispatcher",
  carrierId: "11111111-1111-1111-1111-111111111111",
}

const requirePermissionMock = vi.mocked(requirePermission)
const saveDocumentMock = vi.mocked(saveDocument)
const createDriverMock = vi.mocked(createDriver)
const createTruckMock = vi.mocked(createTruck)
const logAuditMock = vi.mocked(logAudit)

function formDataFor(kind: string, payload: Record<string, unknown>): FormData {
  const fd = new FormData()
  fd.set("kind", kind)
  fd.set("payload", JSON.stringify(payload))
  fd.set("file", new File(["%PDF"], "w9.pdf", { type: "application/pdf" }))
  return fd
}

beforeEach(() => {
  requirePermissionMock.mockReset()
  requirePermissionMock.mockResolvedValue(ACTOR as never)
  saveDocumentMock.mockClear()
  createDriverMock.mockReset()
  createTruckMock.mockReset()
  logAuditMock.mockClear()
  createDriverMock.mockResolvedValue({ id: "driver-1" } as never)
  createTruckMock.mockResolvedValue({ id: "truck-1" } as never)
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

describe("applySmartScanAction audits the registration truck branch", () => {
  it("logs fleet identity when a registration scan creates a truck", async () => {
    const result = await applySmartScanAction(formDataFor("registration", {
      unit_number: "101",
      vin: "1XKADP9X0LJ123456",
      plate: "ABC1234",
      plate_state: "WA",
      year: 2022,
      make: "Kenworth",
      model: "T680",
      registration_expiry: "2027-03-31",
    }))
    expect(result.ok).toBe(true)
    expect(createTruckMock).toHaveBeenCalledWith(
      ACTOR.carrierId,
      expect.objectContaining({
        unit_number: "101",
        vin: "1XKADP9X0LJ123456",
        plate: "ABC1234",
        plate_state: "WA",
        ownership: "company",
        status: "active",
        assigned_driver_id: null,
      })
    )
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith({
      carrierId: ACTOR.carrierId,
      actorId: ACTOR.id,
      actorName: ACTOR.name,
      entityType: "truck",
      entityId: "truck-1",
      action: "smart_setup_create",
      newValue: {
        kind: "registration",
        unit_number: "101",
        vin: "1XKADP9X0LJ123456",
        plate: "ABC1234",
        plate_state: "WA",
        year: 2022,
        make: "Kenworth",
        model: "T680",
        ownership: "company",
        registration_expiry: "2027-03-31",
      },
    })
  })

  it("skips createTruck and the audit when unit number is missing", async () => {
    const result = await applySmartScanAction(formDataFor("registration", { vin: "1XKADP9X0LJ123456" }))
    expect(result).toEqual({ ok: false, error: "Unit number is required" })
    expect(createTruckMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("skips the audit log when fleet:write is denied", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: viewer cannot fleet:write"))
    const result = await applySmartScanAction(formDataFor("registration", { unit_number: "101" }))
    expect(result.ok).toBe(false)
    expect(createTruckMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
    expect(requirePermissionMock).toHaveBeenCalledWith("fleet:write")
  })
})
