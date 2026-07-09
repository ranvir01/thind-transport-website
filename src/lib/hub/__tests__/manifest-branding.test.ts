/**
 * Per-tenant PWA manifest (Phase 7 branding, isolation suite): the Hub's
 * manifest.webmanifest was a single static file for every tenant, so
 * carrier_settings.branding.accent — already wired into invoice/settlement/
 * IFTA PDFs (see pdf-branding.test.ts) — never reached the installed-app
 * theme color. Pins that the manifest reads each signed-in owner's OWN
 * carrier's accent (never another tenant's) and falls back to the neutral
 * default when signed out, unset, or scoped to no carrier (platform_admin).
 *
 * Lives at /api/hub/manifest, not /hub/manifest.webmanifest — the latter
 * would fall inside src/proxy.ts's `/hub/:path*` auth gate and 307-redirect
 * every unauthenticated manifest fetch to /hub/login (verified empirically:
 * Next's file-convention manifest.ts route is not exempt from route-segment
 * middleware the way robots.ts/sitemap.ts happen to be at the app root).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../session", () => ({ getHubUser: vi.fn() }))
vi.mock("../settings", () => ({ getCarrierSettings: vi.fn() }))

import { getHubUser } from "../session"
import { getCarrierSettings } from "../settings"
import { buildManifest as manifest, resolveManifestThemeColor } from "@/app/api/hub/manifest/route"
import { PRODUCT } from "../product"

const getHubUserMock = vi.mocked(getHubUser)
const getCarrierSettingsMock = vi.mocked(getCarrierSettings)

const DEFAULT = "#0E1621"
const TENANT_A = "11111111-1111-1111-1111-111111111111"
const TENANT_B = "22222222-2222-2222-2222-222222222222"

function settingsWithAccent(accent: string | null) {
  return {
    branding: { accent },
  } as Awaited<ReturnType<typeof getCarrierSettings>>
}

beforeEach(() => {
  getHubUserMock.mockReset()
  getCarrierSettingsMock.mockReset()
})

describe("resolveManifestThemeColor", () => {
  it("defaults when signed out", async () => {
    getHubUserMock.mockResolvedValue(null)
    expect(await resolveManifestThemeColor()).toBe(DEFAULT)
    expect(getCarrierSettingsMock).not.toHaveBeenCalled()
  })

  it("defaults for a carrier-less session (platform_admin)", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Admin", email: "a@a.com", role: "platform_admin", carrierId: "",
    })
    expect(await resolveManifestThemeColor()).toBe(DEFAULT)
    expect(getCarrierSettingsMock).not.toHaveBeenCalled()
  })

  it("defaults when the tenant has no accent set", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent(null))
    expect(await resolveManifestThemeColor()).toBe(DEFAULT)
  })

  it("rejects a malformed stored accent rather than trusting it verbatim", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent("javascript:alert(1)"))
    expect(await resolveManifestThemeColor()).toBe(DEFAULT)
  })

  it("uses tenant A's own accent, scoped to tenant A's carrierId only", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent("#2563EB"))
    expect(await resolveManifestThemeColor()).toBe("#2563EB")
    expect(getCarrierSettingsMock).toHaveBeenCalledWith(TENANT_A)
  })

  it("never leaks tenant A's accent into tenant B's manifest", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent("#2563EB"))
    expect(await resolveManifestThemeColor()).toBe("#2563EB")

    getHubUserMock.mockResolvedValue({
      id: "u2", name: "Sam", email: "s@b.com", role: "owner", carrierId: TENANT_B,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent(null))
    expect(await resolveManifestThemeColor()).toBe(DEFAULT)
    expect(getCarrierSettingsMock).toHaveBeenLastCalledWith(TENANT_B)
  })
})

describe("manifest()", () => {
  it("carries the resolved theme color into both color fields, product identity unchanged", async () => {
    getHubUserMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: TENANT_A,
    })
    getCarrierSettingsMock.mockResolvedValue(settingsWithAccent("#2563EB"))

    const result = await manifest()
    expect(result.theme_color).toBe("#2563EB")
    expect(result.background_color).toBe("#2563EB")
    expect(result.name).toBe(PRODUCT.name)
    expect(result.short_name).toBe(PRODUCT.shortName)
    expect(result.scope).toBe("/hub")
    expect(result.icons?.length).toBe(3)
  })
})
