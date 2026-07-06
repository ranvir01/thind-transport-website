/**
 * Regression: saveIntegrationCredentialsAction let a carrier submit
 * credentials for "planned" providers (qbo, factor, truckstop) — providers
 * with no client and no entry in the hub.api_credentials provider CHECK
 * constraint — so the INSERT surfaced a raw Postgres constraint-violation
 * message instead of an honest "not built yet" error.
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

import { saveCredentials } from "@/lib/hub/credentials"
import { saveIntegrationCredentialsAction } from "@/app/hub/_actions/integrations"

const saveCredentialsMock = vi.mocked(saveCredentials)

beforeEach(() => {
  saveCredentialsMock.mockClear()
})

describe("saveIntegrationCredentialsAction", () => {
  it("rejects planned providers with an honest message instead of hitting the DB", async () => {
    const result = await saveIntegrationCredentialsAction("qbo", { clientId: "abc" })
    expect(result).toEqual({ ok: false, error: "This integration isn't built yet — nothing to connect" })
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })

  it("still saves a stub-status provider (client built, just unconfirmed live)", async () => {
    const result = await saveIntegrationCredentialsAction("comdata", { apiKey: "k", apiSecret: "s" })
    expect(result).toEqual({ ok: true })
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      "carrier-1", "comdata", { apiKey: "k", apiSecret: "s" }, "u1"
    )
  })
})
