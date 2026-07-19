import { describe, expect, it } from "vitest"
import { egressBlocked, egressBlockedThrown } from "../../../../scripts/prod-smoke.mjs"

/** Minimal stand-in for a fetch Response: just status + headers. */
function res(status: number, headers: Record<string, string> = {}) {
  return { status, headers: new Headers(headers) } as Response
}

/** The undici cause chain a CONNECT-refusing proxy produces (observed on Node 22). */
function connectRefusalError(status = 403): Error {
  const inner = new Error(`Proxy response (${status}) !== 200 when HTTP Tunneling`)
  const middle = new Error("Request was cancelled.", { cause: inner })
  return new TypeError("fetch failed", { cause: middle })
}

describe("egressBlocked (gateway answers the request with 403)", () => {
  it("detects the sandbox gateway by its x-deny-reason header", () => {
    expect(egressBlocked(res(403, { "x-deny-reason": "host_not_allowed" }), "")).toBe(true)
  })

  it("detects the gateway by its allowlist body when the header is absent", () => {
    expect(egressBlocked(res(403), "Host not in allowlist\n")).toBe(true)
  })

  it("treats a plain 403 without gateway markers as a real prod response", () => {
    expect(egressBlocked(res(403), "Forbidden")).toBe(false)
  })

  it("never flags non-403 statuses", () => {
    expect(egressBlocked(res(500, { "x-deny-reason": "host_not_allowed" }), "Host not in allowlist")).toBe(false)
  })
})

describe("egressBlockedThrown (proxy refuses the CONNECT tunnel)", () => {
  it("finds the tunnel refusal buried in the fetch-failed cause chain", () => {
    expect(egressBlockedThrown(connectRefusalError())).toMatch(/403.*HTTP Tunneling/)
  })

  it("flags any tunnel refusal status — the probe never reached prod", () => {
    expect(egressBlockedThrown(connectRefusalError(407))).toMatch(/407/)
  })

  it("matches the refusal even when thrown bare, without the fetch wrapper", () => {
    expect(egressBlockedThrown(new Error("Proxy response (403) !== 200 when HTTP Tunneling"))).toBeTruthy()
  })

  it("returns null for unrelated network errors", () => {
    expect(egressBlockedThrown(new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND") }))).toBeNull()
    expect(egressBlockedThrown(new Error("connect ECONNREFUSED 127.0.0.1:443"))).toBeNull()
  })

  it("survives cyclic cause chains", () => {
    const a = new Error("fetch failed")
    ;(a as Error & { cause: unknown }).cause = a
    expect(egressBlockedThrown(a)).toBeNull()
  })
})
