import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ carrierId: "carrier-1", id: "user-1", name: "Owner" })),
  getHubUser: vi.fn(),
}))
vi.mock("@/lib/hub/claims", () => ({
  createClaim: vi.fn(async () => ({ id: "claim-1" })),
  updateClaim: vi.fn(async () => ({ id: "claim-1" })),
}))
vi.mock("@/lib/hub/incidents", () => ({ createIncident: vi.fn(), updateIncident: vi.fn() }))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { saveClaim } from "@/app/hub/_actions/safety"
import { requirePermission } from "@/lib/hub/session"
import { createClaim, updateClaim } from "@/lib/hub/claims"
import { logAudit } from "@/lib/hub/audit"

const createMock = vi.mocked(createClaim)
const updateMock = vi.mocked(updateClaim)
const permMock = vi.mocked(requirePermission)
const auditMock = vi.mocked(logAudit)

beforeEach(() => {
  createMock.mockClear()
  updateMock.mockClear()
  auditMock.mockClear()
  permMock.mockClear()
  permMock.mockResolvedValue({ carrierId: "carrier-1", id: "user-1", name: "Owner" } as never)
})

describe("saveClaim permission gate", () => {
  it("requires compliance:write and returns an error instead of throwing", async () => {
    permMock.mockRejectedValueOnce(new Error("Forbidden"))
    const result = await saveClaim(null, { kind: "cargo", status: "open" })
    expect(result.ok).toBe(false)
    expect(createMock).not.toHaveBeenCalled()
    expect(permMock).toHaveBeenCalledWith("compliance:write")
  })
})

describe("saveClaim money parsing (canonical dollarsToCents)", () => {
  it("parses a typed dollar amount to integer cents", async () => {
    await saveClaim(null, { kind: "cargo", status: "open", amount: "1250.50" })
    expect(createMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ amountCents: 125050 })
    )
  })

  it("blank amount stays null — an unknown exposure is not $0", async () => {
    await saveClaim(null, { kind: "cargo", status: "open", amount: "" })
    expect(createMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ amountCents: null })
    )
  })

  it("a genuinely zero settlement is 0 cents, not null", async () => {
    await saveClaim("claim-1", { kind: "cargo", status: "settled", amount: "0.00" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "claim-1",
      expect.objectContaining({ amountCents: 0 })
    )
  })
})

describe("saveClaim create/update wiring", () => {
  it("audits every save (money-adjacent mutation)", async () => {
    await saveClaim(null, { kind: "cargo", status: "open", amount: "100" })
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "claim", entityId: "claim-1", action: "create" })
    )
    await saveClaim("claim-1", { kind: "cargo", status: "filed" })
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "claim", entityId: "claim-1", action: "update" })
    )
  })

  it("surfaces a not-found update as an error, not a silent success", async () => {
    updateMock.mockResolvedValueOnce(null)
    const result = await saveClaim("missing", { kind: "cargo", status: "open" })
    expect(result).toEqual({ ok: false, error: "Claim not found" })
    expect(auditMock).not.toHaveBeenCalled()
  })

  it("empty-string selects clear to null so tenancy guards see no ref at all", async () => {
    await saveClaim(null, { kind: "injury", status: "open", loadId: "", incidentId: "" })
    expect(createMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ loadId: null, incidentId: null })
    )
  })
})
