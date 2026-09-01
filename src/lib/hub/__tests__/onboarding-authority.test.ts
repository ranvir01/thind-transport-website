/**
 * verifyCarrierAuthorityAction (src/app/hub/_actions/onboarding.ts) — the
 * first slice of phase-7.md's onboarding wizard: live DOT/MC lookup via
 * FMCSA QCMobile at signup time, before any carrier row exists. Pins: no
 * webKey configured degrades gracefully instead of throwing, a match
 * surfaces legal name + authority status, a miss across both identifiers
 * reports "not found" rather than silently succeeding, and the action never
 * touches the DB (nothing to persist pre-signup, nothing to leak cross-tenant).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  hubDb: vi.fn(),
  queryOne: vi.fn(async () => null),
  query: vi.fn(async () => []),
}))
vi.mock("../session", () => ({ getHubUser: vi.fn(), requireOwner: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { queryOne } from "../db"
import { verifyCarrierAuthorityAction } from "@/app/hub/_actions/onboarding"

const queryOneMock = vi.mocked(queryOne)

const DOCKET_ENVELOPE = {
  content: [
    {
      carrier: {
        legalName: "CASCADE LINES LLC",
        dbaName: "CASCADE LINES",
        allowedToOperate: "Y",
        commonAuthorityStatus: "A",
      },
    },
  ],
}

const INACTIVE_ENVELOPE = {
  content: [{ carrier: { legalName: "STALE CARRIER LLC", allowToOperate: "N", commonAuthorityStatus: "I" } }],
}

const ORIGINAL_WEBKEY = process.env.FMCSA_WEBKEY

beforeEach(() => {
  queryOneMock.mockClear()
  process.env.FMCSA_WEBKEY = "test-webkey"
})

afterEach(() => {
  vi.unstubAllGlobals()
  process.env.FMCSA_WEBKEY = ORIGINAL_WEBKEY
})

describe("verifyCarrierAuthorityAction", () => {
  it("reports not-configured when FMCSA_WEBKEY is unset, without calling fetch", async () => {
    delete process.env.FMCSA_WEBKEY
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await verifyCarrierAuthorityAction({ dotNumber: "123456" })

    expect(result).toEqual({ ok: false, result: null, error: "Live verification isn't configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects an empty DOT/MC without calling fetch", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await verifyCarrierAuthorityAction({})

    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("surfaces legal name and authority status on a match", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => DOCKET_ENVELOPE })))

    const result = await verifyCarrierAuthorityAction({ mcNumber: "MC-654321" })

    expect(result).toEqual({
      ok: true,
      result: {
        legalName: "CASCADE LINES LLC",
        dbaName: "CASCADE LINES",
        allowedToOperate: true,
        authorityStatus: "A",
      },
    })
  })

  it("flags a carrier on file but not currently allowed to operate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => INACTIVE_ENVELOPE })))

    const result = await verifyCarrierAuthorityAction({ dotNumber: "999999" })

    expect(result.ok).toBe(true)
    expect(result.result?.allowedToOperate).toBe(false)
    expect(result.result?.authorityStatus).toBe("I")
  })

  it("falls back from MC to DOT when the docket lookup 404s", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/docket-number/")) return { ok: false, json: async () => ({}) }
      return { ok: true, json: async () => DOCKET_ENVELOPE }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await verifyCarrierAuthorityAction({ mcNumber: "654321", dotNumber: "123456" })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reports no-record-found when both identifiers miss", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })))

    const result = await verifyCarrierAuthorityAction({ mcNumber: "000000", dotNumber: "000000" })

    expect(result).toEqual({ ok: false, result: null, error: "No FMCSA record found for that DOT/MC" })
  })

  it("never touches the database — nothing exists to scope by tenant yet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => DOCKET_ENVELOPE })))

    await verifyCarrierAuthorityAction({ dotNumber: "123456" })

    expect(queryOneMock).not.toHaveBeenCalled()
  })
})
