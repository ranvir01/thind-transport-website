/**
 * disconnectIntegrationAction had zero test coverage — it's the server
 * action behind the "Disconnect" button on every connected integration
 * card (src/app/hub/_actions/integrations.ts). Covers: credentials
 * deleted + audited on success, and a DB failure surfacing the honest
 * fallback message instead of a raw error.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOwner: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/credentials", () => ({
  credentialsConfigured: vi.fn(() => true),
  getCredentials: vi.fn(),
  saveCredentials: vi.fn(async () => undefined),
  deleteCredentials: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/telematics", () => ({ runTelematicsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/efs", () => ({ runEfsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/comdata", () => ({ runComdataSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/wex", () => ({ runWexSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/qbo", () => ({ runQboSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/event-processors", () => ({ retryUnprocessedEvents: vi.fn() }))

import { revalidatePath } from "next/cache"
import { deleteCredentials } from "@/lib/hub/credentials"
import { logAudit } from "@/lib/hub/audit"
import { disconnectIntegrationAction } from "@/app/hub/_actions/integrations"

const deleteCredentialsMock = vi.mocked(deleteCredentials)
const logAuditMock = vi.mocked(logAudit)
const revalidatePathMock = vi.mocked(revalidatePath)

beforeEach(() => {
  deleteCredentialsMock.mockReset().mockResolvedValue(undefined)
  logAuditMock.mockClear()
  revalidatePathMock.mockClear()
})

describe("disconnectIntegrationAction", () => {
  it("deletes credentials, audits the disconnect, and revalidates the settings page", async () => {
    const result = await disconnectIntegrationAction("efs")
    expect(result).toEqual({ ok: true })
    expect(deleteCredentialsMock).toHaveBeenCalledWith("carrier-1", "efs")
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: "carrier-1", actorId: "u1", entityType: "integration", entityId: "efs", action: "disconnected",
      })
    )
    expect(revalidatePathMock).toHaveBeenCalledWith("/hub/settings/integrations")
  })

  it("returns an honest fallback message when the delete fails", async () => {
    deleteCredentialsMock.mockRejectedValue(new Error("connection terminated"))
    const result = await disconnectIntegrationAction("qbo")
    expect(result).toEqual({ ok: false, error: "Could not disconnect" })
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})
