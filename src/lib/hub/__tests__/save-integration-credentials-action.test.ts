/**
 * saveIntegrationCredentialsAction — merges submitted fields over whatever is
 * already stored instead of overwriting the whole envelope, so rotating one
 * credential (e.g. a leaked webhook secret) never blanks the others.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOwner: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/credentials", () => ({
  credentialsConfigured: vi.fn(() => true),
  getCredentials: vi.fn(),
  getStoredCredentials: vi.fn(),
  saveCredentials: vi.fn(async () => undefined),
  deleteCredentials: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/telematics", () => ({ runTelematicsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/efs", () => ({ runEfsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/comdata", () => ({ runComdataSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/wex", () => ({ runWexSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/qbo", () => ({ runQboSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/event-processors", () => ({ retryUnprocessedEvents: vi.fn() }))

import { getStoredCredentials, saveCredentials } from "@/lib/hub/credentials"
import { saveIntegrationCredentialsAction } from "@/app/hub/_actions/integrations"

const getCredentialsMock = vi.mocked(getStoredCredentials)
const saveCredentialsMock = vi.mocked(saveCredentials)

beforeEach(() => {
  getCredentialsMock.mockReset()
  saveCredentialsMock.mockReset().mockResolvedValue(undefined)
})

describe("saveIntegrationCredentialsAction", () => {
  it("merges a partial update over existing credentials instead of overwriting them", async () => {
    getCredentialsMock.mockResolvedValue({ apiKey: "old-key", webhookSecret: "old-secret" })
    const result = await saveIntegrationCredentialsAction("factor", { webhookSecret: "rotated-secret" })
    expect(result.ok).toBe(true)
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      "carrier-1", "factor", { apiKey: "old-key", webhookSecret: "rotated-secret" }, "u1"
    )
  })

  it("saves only the submitted fields when nothing is stored yet", async () => {
    getCredentialsMock.mockResolvedValue(null)
    const result = await saveIntegrationCredentialsAction("dat", {
      serviceAccountEmail: "ops@carrier.com", password: "secret",
    })
    expect(result.ok).toBe(true)
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      "carrier-1", "dat", { serviceAccountEmail: "ops@carrier.com", password: "secret" }, "u1"
    )
  })

  it("ignores fields outside the provider's allowlist and blank submissions", async () => {
    getCredentialsMock.mockResolvedValue({ apiKey: "old-key" })
    const result = await saveIntegrationCredentialsAction("terminal", {
      apiKey: "  ", notARealField: "sneaky",
    })
    expect(result.ok).toBe(false)
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })
})
