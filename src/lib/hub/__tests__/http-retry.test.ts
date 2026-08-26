/**
 * Implementation brief §4.1 — flagged as the highest-value available
 * integration work, and as a Backlog item in three separate scout docs.
 *
 * Terminal is the one adapter making real production calls and its cron runs
 * DAILY, so a single transient 503 is a ~24-hour hole in position and HOS
 * data with no alert and no retry until tomorrow.
 *
 * Sleep is injected throughout — these assert the backoff arithmetic without
 * spending it.
 */
import { describe, expect, it, vi } from "vitest"
import {
  backoffMs,
  fetchWithRetry,
  isRetryableStatus,
  parseRetryAfterMs,
} from "../integrations/http-retry"

const noSleep = async () => {}
const fixedRandom = () => 1 // full ceiling, no jitter reduction

function responses(...statuses: (number | Error)[]) {
  const calls: string[] = []
  const fn = vi.fn(async (url: string) => {
    const next = statuses[calls.length]
    calls.push(url)
    if (next instanceof Error) throw next
    return new Response("{}", { status: next })
  })
  return { fn, calls }
}

describe("isRetryableStatus", () => {
  it("retries 429 and every 5xx", () => {
    for (const s of [429, 500, 502, 503, 504, 599]) expect(isRetryableStatus(s), String(s)).toBe(true)
  })

  it("does not retry other 4xx — a 401 will not become a 200 by asking again", () => {
    for (const s of [400, 401, 403, 404, 409, 422]) expect(isRetryableStatus(s), String(s)).toBe(false)
  })

  it("does not retry success", () => {
    for (const s of [200, 201, 204, 304]) expect(isRetryableStatus(s), String(s)).toBe(false)
  })
})

describe("parseRetryAfterMs", () => {
  const now = Date.parse("2026-10-21T07:00:00Z")

  it("reads delta-seconds", () => {
    expect(parseRetryAfterMs("120", now)).toBe(120_000)
    expect(parseRetryAfterMs("0", now)).toBe(0)
  })

  it("reads an HTTP-date", () => {
    expect(parseRetryAfterMs("Wed, 21 Oct 2026 07:00:30 GMT", now)).toBe(30_000)
  })

  it("ignores a date already in the past rather than waiting a negative amount", () => {
    expect(parseRetryAfterMs("Wed, 21 Oct 2026 06:59:00 GMT", now)).toBeNull()
  })

  it("ignores junk and a missing header", () => {
    expect(parseRetryAfterMs(null, now)).toBeNull()
    expect(parseRetryAfterMs("soon", now)).toBeNull()
    expect(parseRetryAfterMs("", now)).toBeNull()
  })
})

describe("backoffMs", () => {
  it("doubles per attempt and honors the ceiling", () => {
    expect(backoffMs(0, 500, 8000, fixedRandom)).toBe(500)
    expect(backoffMs(1, 500, 8000, fixedRandom)).toBe(1000)
    expect(backoffMs(2, 500, 8000, fixedRandom)).toBe(2000)
    expect(backoffMs(5, 500, 8000, fixedRandom)).toBe(8000) // capped
    expect(backoffMs(99, 500, 8000, fixedRandom)).toBe(8000)
  })

  it("jitters between half and full — a fleet-wide sync must not retry in lockstep", () => {
    expect(backoffMs(1, 500, 8000, () => 0)).toBe(500) // half of 1000
    expect(backoffMs(1, 500, 8000, () => 1)).toBe(1000)
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const ms = backoffMs(2, 500, 8000, () => r)
      expect(ms).toBeGreaterThanOrEqual(1000)
      expect(ms).toBeLessThanOrEqual(2000)
    }
  })
})

describe("fetchWithRetry", () => {
  it("returns immediately on success without sleeping", async () => {
    const { fn } = responses(200)
    globalThis.fetch = fn as never
    const sleep = vi.fn(async () => {})

    const res = await fetchWithRetry("https://x.test/v", {}, { sleep })
    expect(res.status).toBe(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("retries a 503 and returns the eventual success", async () => {
    const { fn } = responses(503, 200)
    globalThis.fetch = fn as never
    const res = await fetchWithRetry("https://x.test/v", {}, { sleep: noSleep })
    expect(res.status).toBe(200)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("retries a 429 and returns the eventual success", async () => {
    const { fn } = responses(429, 429, 200)
    globalThis.fetch = fn as never
    const res = await fetchWithRetry("https://x.test/v", {}, { sleep: noSleep, attempts: 3 })
    expect(res.status).toBe(200)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("never retries a successful response, whatever its status field claims", async () => {
    // A real fixture in this repo returned { ok: true, status: 503 }. That is
    // not a response any server can send, but trusting the status alone made
    // every success path burn three real backoff waits.
    const fn = vi.fn(async () => ({ ok: true, status: 503, json: async () => ({}) }))
    globalThis.fetch = fn as never
    const sleep = vi.fn(async () => {})

    await fetchWithRetry("https://x.test/v", {}, { sleep })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("does NOT retry a 401 — it surfaces immediately so the real error is visible", async () => {
    const { fn } = responses(401, 200)
    globalThis.fetch = fn as never
    const res = await fetchWithRetry("https://x.test/v", {}, { sleep: noSleep })
    expect(res.status).toBe(401)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("returns the last response rather than throwing when retries are exhausted on a status", async () => {
    // The caller's own `if (!response.ok) throw` keeps its message.
    const { fn } = responses(503, 503, 503)
    globalThis.fetch = fn as never
    const res = await fetchWithRetry("https://x.test/v", {}, { sleep: noSleep, attempts: 3 })
    expect(res.status).toBe(503)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("retries a transport failure (timeout / DNS) and succeeds", async () => {
    const { fn } = responses(new Error("ETIMEDOUT"), 200)
    globalThis.fetch = fn as never
    const res = await fetchWithRetry("https://x.test/v", {}, { sleep: noSleep })
    expect(res.status).toBe(200)
  })

  it("throws with the underlying cause when every attempt fails at the transport level", async () => {
    const { fn } = responses(new Error("ETIMEDOUT"), new Error("ETIMEDOUT"), new Error("ECONNRESET"))
    globalThis.fetch = fn as never
    await expect(
      fetchWithRetry("https://x.test/v", {}, { sleep: noSleep, attempts: 3, label: "Terminal /vehicles" })
    ).rejects.toThrow(/Terminal \/vehicles failed after 3 attempts: ECONNRESET/)
  })

  it("honors Retry-After over its own backoff", async () => {
    const slept: number[] = []
    globalThis.fetch = vi.fn(async () =>
      slept.length === 0
        ? new Response("{}", { status: 429, headers: { "retry-after": "7" } })
        : new Response("{}", { status: 200 })
    ) as never

    await fetchWithRetry(
      "https://x.test/v",
      {},
      { sleep: async (ms) => void slept.push(ms), random: fixedRandom }
    )
    // 7 seconds from the header, not the 500ms first backoff. Azure APIM (which
    // fronts OTR) sends this, and ignoring it gets the key throttled harder.
    expect(slept).toEqual([7000])
  })

  it("falls back to its own backoff when Retry-After is junk", async () => {
    const slept: number[] = []
    globalThis.fetch = vi.fn(async () =>
      slept.length === 0
        ? new Response("{}", { status: 429, headers: { "retry-after": "soon" } })
        : new Response("{}", { status: 200 })
    ) as never

    await fetchWithRetry(
      "https://x.test/v",
      {},
      { sleep: async (ms) => void slept.push(ms), random: fixedRandom }
    )
    expect(slept).toEqual([500])
  })

  it("passes the request init straight through", async () => {
    const fn = vi.fn(async () => new Response("{}", { status: 200 }))
    globalThis.fetch = fn as never
    const init = { headers: { Authorization: "Bearer k", "Connection-Token": "t" } }
    await fetchWithRetry("https://x.test/v", init, { sleep: noSleep })
    expect(fn).toHaveBeenCalledWith("https://x.test/v", init)
  })
})
