/**
 * getTrackAccent resolves a share-link token to the carrier's chrome accent
 * for the public /track page. Public surface, so the failure posture matters
 * as much as the happy path: unknown/revoked tokens and any storage error
 * must fall back to the stock chrome, never throw into the page render.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ queryOne: vi.fn(async () => null) }))
vi.mock("@/lib/hub/settings", () => ({ getCarrierSettings: vi.fn() }))

import { queryOne } from "@/lib/hub/db"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PORTAL_ACCENT_DEFAULT } from "@/app/hub/portal/accent"
import { getTrackAccent } from "./accent"

const queryOneMock = vi.mocked(queryOne)
const settingsMock = vi.mocked(getCarrierSettings)

function settingsWithAccent(accent: string | null) {
  return { branding: { accent } } as Awaited<ReturnType<typeof getCarrierSettings>>
}

describe("getTrackAccent", () => {
  beforeEach(() => {
    queryOneMock.mockReset()
    settingsMock.mockReset()
  })

  it("returns the stock chrome for an unknown or revoked token, without reading settings", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    expect(await getTrackAccent("nope")).toEqual(PORTAL_ACCENT_DEFAULT)
    expect(settingsMock).not.toHaveBeenCalled()
    // Same guard as getTrackedLoad: revoked links must not resolve.
    expect(queryOneMock.mock.calls[0][0]).toContain("revoked_at IS NULL")
    expect(queryOneMock.mock.calls[0][1]).toEqual(["nope"])
  })

  it("resolves the linked carrier's accent through the WCAG gate", async () => {
    queryOneMock.mockResolvedValueOnce({ carrier_id: "carrier-1" })
    settingsMock.mockResolvedValueOnce(settingsWithAccent("#4ADE80"))
    const accent = await getTrackAccent("tok")
    expect(settingsMock).toHaveBeenCalledWith("carrier-1")
    expect(accent.text).toBe("#4ADE80")
    expect(accent.rule).toBe("rgba(74, 222, 128, 0.4)")
  })

  it("keeps the stock chrome when the carrier has no accent set", async () => {
    queryOneMock.mockResolvedValueOnce({ carrier_id: "carrier-1" })
    settingsMock.mockResolvedValueOnce(settingsWithAccent(null))
    expect(await getTrackAccent("tok")).toEqual(PORTAL_ACCENT_DEFAULT)
  })

  it("falls back to the stock chrome on a db error instead of throwing", async () => {
    queryOneMock.mockRejectedValueOnce(new Error("db down"))
    expect(await getTrackAccent("tok")).toEqual(PORTAL_ACCENT_DEFAULT)
  })

  it("falls back to the stock chrome on a settings error instead of throwing", async () => {
    queryOneMock.mockResolvedValueOnce({ carrier_id: "carrier-1" })
    settingsMock.mockRejectedValueOnce(new Error("settings down"))
    expect(await getTrackAccent("tok")).toEqual(PORTAL_ACCENT_DEFAULT)
  })
})
