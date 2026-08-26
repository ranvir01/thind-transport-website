/**
 * Regression: saveIntegrationCredentialsAction must refuse "planned"
 * providers (no client yet) with an honest message instead of a raw DB
 * constraint error. Stub/live providers still save credentials.
 *
 * Registry status has moved since the original fix (factor is stub, qbo
 * is live, truckstop is live) — the planned guard is exercised via a
 * mocked spec.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requireOwner: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
// queryOne backs getCredentials' merge-then-save read. It must be mocked even
// though credentialsConfigured is mocked true: getCredentials calls its
// module-LOCAL credentialsConfigured (partial mocks only rewire importers),
// so with a real CREDENTIALS_KEY in the env (any shell that sourced
// .env.local) it reaches the DB and an incomplete mock fails the save test.
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/credentials", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hub/credentials")>("@/lib/hub/credentials")
  return { ...actual, credentialsConfigured: vi.fn(() => true), saveCredentials: vi.fn(async () => undefined) }
})

const providerSpecMock = vi.fn()
const allowedFieldsMock = vi.fn((..._args: unknown[]) => ["clientId", "clientSecret", "refreshToken", "realmId", "apiKey", "apiSecret"])

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
