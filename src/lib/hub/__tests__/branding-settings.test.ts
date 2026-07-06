/**
 * setBrandAccentAction (src/app/hub/_actions/onboarding.ts) writes
 * settings.branding.accent, but CarrierSettings had no `branding` field and
 * nothing pinned the round trip — the SaaS-lane survey flagged it as a dead
 * write path. This pins: getCarrierSettings surfaces branding (defaulting to
 * null when unset), setBrandAccentAction validates the hex color and is
 * owner-only, and the value it writes is what a subsequent read returns.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../session", () => ({ requireOwner: vi.fn() }))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { requireOwner } from "../session"
import { query, queryOne } from "../db"
import { setBrandAccentAction } from "@/app/hub/_actions/onboarding"
import { DEFAULT_SETTINGS, getCarrierSettings } from "../settings"

const requireOwnerMock = vi.mocked(requireOwner)
const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER_ID = "33333333-3333-3333-3333-333333333333"

beforeEach(() => {
  requireOwnerMock.mockReset()
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("getCarrierSettings branding", () => {
  it("defaults branding.accent to null when nothing is stored", async () => {
    queryOneMock.mockResolvedValue({ settings: {} })
    const settings = await getCarrierSettings(CARRIER_ID)
    expect(settings.branding).toEqual(DEFAULT_SETTINGS.branding)
    expect(settings.branding.accent).toBeNull()
  })

  it("surfaces a stored accent color", async () => {
    queryOneMock.mockResolvedValue({ settings: { branding: { accent: "#112233" } } })
    const settings = await getCarrierSettings(CARRIER_ID)
    expect(settings.branding.accent).toBe("#112233")
  })
})

describe("setBrandAccentAction", () => {
  it("rejects a non-owner without writing anything", async () => {
    requireOwnerMock.mockRejectedValue(new Error("NEXT_REDIRECT"))
    const result = await setBrandAccentAction("#112233")
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("rejects a malformed color without writing anything", async () => {
    requireOwnerMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: CARRIER_ID,
    })
    const result = await setBrandAccentAction("blue")
    expect(result).toEqual({ ok: false, error: "Pick a color" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("writes the validated accent scoped to the owner's own carrier", async () => {
    requireOwnerMock.mockResolvedValue({
      id: "u1", name: "Priya", email: "p@a.com", role: "owner", carrierId: CARRIER_ID,
    })
    const result = await setBrandAccentAction("#a1B2c3")
    expect(result).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("jsonb_set(settings, '{branding,accent}'")
    expect(params).toEqual([CARRIER_ID, "#a1B2c3"])
  })
})
