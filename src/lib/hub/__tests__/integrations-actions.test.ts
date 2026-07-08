/**
 * Regression: saveIntegrationCredentialsAction must refuse "planned"
 * providers (no client yet) with an honest message instead of a raw DB
 * constraint error. Stub/live providers still save credentials.
 *
 * Registry status has moved since the original fix (qbo/factor are stub,
 * truckstop is live) — the planned guard is exercised via a mocked spec.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOwner: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/credentials", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hub/credentials")>("@/lib/hub/credentials")
  return { ...actual, credentialsConfigured: vi.fn(() => true), saveCredentials: vi.fn(async () => undefined) }
})

const providerSpecMock = vi.fn()
const allowedFieldsMock = vi.fn(() => ["clientId", "clientSecret", "refreshToken", "realmId", "apiKey", "apiSecret"])

vi.mock("@/lib/hub/integrations/registry", () => ({
  providerSpec: (...args: unknown[]) => providerSpecMock(...args),
  allowedFields: (...args: unknown[]) => allowedFieldsMock(...args),
}))

import { saveCredentials } from "@/lib/hub/credentials"
import { saveIntegrationCredentialsAction } from "@/app/hub/_actions/integrations"

const saveCredentialsMock = vi.mocked(saveCredentials)

beforeEach(() => {
  saveCredentialsMock.mockClear()
  providerSpecMock.mockReset()
  allowedFieldsMock.mockClear()
})

describe("saveIntegrationCredentialsAction", () => {
  it("rejects planned providers with an honest message instead of hitting the DB", async () => {
    providerSpecMock.mockReturnValue({
      id: "future-provider",
      label: "Future",
      domain: "accounting",
      blurb: "not built",
      fields: [{ key: "clientId", label: "Client ID" }],
      fallback: "CSV",
      sync: "manual",
      status: "planned",
    })
    const result = await saveIntegrationCredentialsAction("qbo", { clientId: "abc" })
    expect(result).toEqual({ ok: false, error: "This integration isn't built yet — nothing to connect" })
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })

  it("still saves a stub-status provider (client built, just unconfirmed live)", async () => {
    providerSpecMock.mockReturnValue({
      id: "qbo",
      label: "QuickBooks Online",
      domain: "accounting",
      blurb: "stub",
      fields: [
        { key: "clientId", label: "Client ID" },
        { key: "clientSecret", label: "Client secret", secret: true },
        { key: "refreshToken", label: "Refresh token", secret: true },
        { key: "realmId", label: "Realm ID" },
      ],
      fallback: "CSV",
      sync: "poll",
      status: "stub",
    })
    allowedFieldsMock.mockReturnValue(["clientId", "clientSecret", "refreshToken", "realmId"])
    const result = await saveIntegrationCredentialsAction("qbo", {
      clientId: "id",
      clientSecret: "sec",
      refreshToken: "rt",
      realmId: "realm",
    })
    expect(result).toEqual({ ok: true })
    expect(saveCredentialsMock).toHaveBeenCalled()
  })
})
