import { afterEach, describe, expect, it, vi } from "vitest"

import { isOfflineError } from "../offline-queue"

/**
 * isOfflineError decides whether a failed driver tap gets queued for replay
 * (connectivity problem) or surfaced as a hard error (real rejection).
 * Misclassifying a flaky-signal failure as a rejection loses the tap.
 */
describe("isOfflineError", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("treats navigator.onLine === false as offline regardless of the error", () => {
    vi.stubGlobal("navigator", { onLine: false })
    expect(isOfflineError(new Error("Forbidden"))).toBe(true)
  })

  it("matches classic fetch connectivity messages", () => {
    expect(isOfflineError(new Error("fetch failed"))).toBe(true)
    expect(isOfflineError(new TypeError("Failed to fetch"))).toBe(true)
    expect(isOfflineError(new Error("A network error occurred"))).toBe(true)
    expect(isOfflineError(new Error("Load failed"))).toBe(true)
    expect(isOfflineError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe(true)
  })

  it("treats an aborted request as offline (fetch timeout on flaky signal)", () => {
    const abort = new Error("The user aborted a request.")
    abort.name = "AbortError"
    expect(isOfflineError(abort)).toBe(true)
  })

  it("treats AbortSignal.timeout's TimeoutError as offline", () => {
    const timeout = new Error("The operation was aborted due to timeout")
    timeout.name = "TimeoutError"
    expect(isOfflineError(timeout)).toBe(true)
  })

  it("matches by name even when the throw is a DOMException-like non-Error", () => {
    expect(isOfflineError({ name: "AbortError", message: "signal is aborted" })).toBe(true)
  })

  it("matches timeout-flavored messages from proxies and node runtimes", () => {
    expect(isOfflineError(new Error("Request timed out"))).toBe(true)
    expect(isOfflineError(new Error("Gateway timeout"))).toBe(true)
    expect(isOfflineError(new Error("connect ETIMEDOUT 10.0.0.1:443"))).toBe(true)
    expect(isOfflineError(new Error("socket hang up (ECONNRESET)"))).toBe(true)
  })

  it("does NOT queue real rejections — those must surface to the driver", () => {
    expect(isOfflineError(new Error("Forbidden"))).toBe(false)
    expect(isOfflineError(new Error("Load already delivered"))).toBe(false)
    expect(isOfflineError(new Error("Invalid payload"))).toBe(false)
    expect(isOfflineError("string rejection")).toBe(false)
    expect(isOfflineError(null)).toBe(false)
  })
})
