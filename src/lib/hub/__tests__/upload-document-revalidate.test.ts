import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "user-1", name: "Dana", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/documents", () => ({
  saveDocument: vi.fn(async () => ({ id: "doc-1" })),
  deleteDocument: vi.fn(async () => true),
}))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/loads", () => ({
  createLoad: vi.fn(), updateLoad: vi.fn(), changeLoadStatus: vi.fn(), replaceStops: vi.fn(),
  setStopTimestamp: vi.fn(), getLoad: vi.fn(), addLoadEvent: vi.fn(async () => undefined), getLoadStops: vi.fn(),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/drivers", () => ({ getDriver: vi.fn(), dispatchLegality: vi.fn() }))
vi.mock("@/lib/hub/fleet", () => ({ getTruck: vi.fn() }))
vi.mock("@/lib/hub/sharelinks", () => ({ createShareLink: vi.fn(), revokeShareLink: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/geocode", () => ({ geocodeCityState: vi.fn() }))

import { uploadDocumentAction } from "@/app/hub/_actions/loads"

function formDataFor(entityType: string, entityId: string): FormData {
  const fd = new FormData()
  fd.set("entity_type", entityType)
  fd.set("entity_id", entityId)
  fd.set("kind", "registration")
  fd.set("file", new File(["x"], "reg.pdf", { type: "application/pdf" }))
  return fd
}

describe("uploadDocumentAction — revalidates the actual detail-page route", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear()
  })

  it("revalidates /hub/fleet/trailers/{id}, not the nonexistent /hub/trailers/{id}", async () => {
    const result = await uploadDocumentAction(formDataFor("trailer", "11111111-1111-1111-1111-111111111111"))
    expect(result.ok).toBe(true)
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/hub/fleet/trailers/11111111-1111-1111-1111-111111111111"
    )
    expect(revalidatePathMock).not.toHaveBeenCalledWith(
      "/hub/trailers/11111111-1111-1111-1111-111111111111"
    )
  })

  it("revalidates /hub/fleet/trucks/{id}, not the nonexistent /hub/trucks/{id}", async () => {
    const result = await uploadDocumentAction(formDataFor("truck", "22222222-2222-2222-2222-222222222222"))
    expect(result.ok).toBe(true)
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/hub/fleet/trucks/22222222-2222-2222-2222-222222222222"
    )
    expect(revalidatePathMock).not.toHaveBeenCalledWith(
      "/hub/trucks/22222222-2222-2222-2222-222222222222"
    )
  })

  it("still revalidates driver and customer detail pages at their real (unprefixed) routes", async () => {
    await uploadDocumentAction(formDataFor("driver", "33333333-3333-3333-3333-333333333333"))
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/hub/drivers/33333333-3333-3333-3333-333333333333"
    )

    revalidatePathMock.mockClear()
    await uploadDocumentAction(formDataFor("customer", "44444444-4444-4444-4444-444444444444"))
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/hub/customers/44444444-4444-4444-4444-444444444444"
    )
  })
})
