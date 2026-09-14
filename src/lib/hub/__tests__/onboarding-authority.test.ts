/**
 * verifyCarrierAuthorityAction (src/app/hub/_actions/onboarding.ts) — the
 * first slice of phase-7.md's onboarding wizard: live DOT/MC lookup via
 * FMCSA QCMobile at signup time, before any carrier row exists. Pins: no
 * webKey configured degrades gracefully instead of throwing, a match
 * surfaces legal name + authority status, a miss across both identifiers
 * reports "not found" rather than silently succeeding, and the action never
 * touches tenant tables (nothing to persist pre-signup, nothing to leak
 * cross-tenant). Signup-scope throttle bookkeeping is the one exception —
 * the same 5-in-15 budget createWorkspace uses, keyed on DOT/MC and IP,
 * so a bot cannot walk FMCSA with the live webKey.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  hubDb: vi.fn(),
  queryOne: vi.fn(async () => null),
  query: vi.fn(async () => []),
}))
vi.mock("../session", () => ({ getHubUser: vi.fn(), requireOwner: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("../auth-throttle", () => ({
  isLockedOut: vi.fn(async () => false),
  recordAttempt: vi.fn(async () => undefined),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })),
}))

import { queryOne } from "../db"
import { isLockedOut, recordAttempt } from "../auth-throttle"
import { verifyCarrierAuthorityAction } from "@/app/hub/_actions/onboarding"

const queryOneMock = vi.mocked(queryOne)
const isLockedOutMock = vi.mocked(isLockedOut)
const recordAttemptMock = vi.mocked(recordAttempt)

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
  isLockedOutMock.mockReset().mockResolvedValue(false)
  recordAttemptMock.mockReset().mockResolvedValue(undefined)
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

  it("never touches tenant tables — nothing exists to scope by tenant yet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => DOCKET_ENVELOPE })))

    await verifyCarrierAuthorityAction({ dotNumber: "123456" })

    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("throttles on the identifier AND the client IP, before any FMCSA fetch", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => DOCKET_ENVELOPE }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await verifyCarrierAuthorityAction({ mcNumber: "MC-654321" })

    expect(result.ok).toBe(true)
    expect(isLockedOutMock.mock.calls).toEqual([
      ["mc:654321", "signup"],
      ["ip:203.0.113.7", "signup"],
    ])
    expect(recordAttemptMock.mock.calls).toEqual([
      ["mc:654321", false, "signup"],
      ["ip:203.0.113.7", false, "signup"],
    ])
    expect(isLockedOutMock.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]
    )
    expect(recordAttemptMock.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]
    )
  })

  it("refuses a throttled lookup with the same generic signup message, without calling fetch", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    isLockedOutMock.mockResolvedValue(true)

    const result = await verifyCarrierAuthorityAction({ dotNumber: "123456" })

    expect(result).toEqual({
      ok: false,
      result: null,
      error: "Too many signup attempts — try again in a few minutes",
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(recordAttemptMock).not.toHaveBeenCalled()
  })

  it("throttles a hammered IP even when each attempt uses a fresh DOT", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    isLockedOutMock.mockImplementation(async (key: string) => key.startsWith("ip:"))

    const result = await verifyCarrierAuthorityAction({ dotNumber: "888888" })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/too many/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("still throttles on the identifier key when no request headers are available", async () => {
    const { headers } = await import("next/headers")
    vi.mocked(headers).mockRejectedValueOnce(new Error("outside a request scope") as never)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => DOCKET_ENVELOPE })))

    const result = await verifyCarrierAuthorityAction({ dotNumber: "123456" })

    expect(result.ok).toBe(true)
    expect(isLockedOutMock.mock.calls).toEqual([["dot:123456", "signup"]])
    expect(recordAttemptMock.mock.calls).toEqual([["dot:123456", false, "signup"]])
  })
})
