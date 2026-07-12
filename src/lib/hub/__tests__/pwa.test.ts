import { describe, expect, it, vi } from "vitest"
import { applyAppBadge, clearShellCache } from "../pwa"

describe("applyAppBadge", () => {
  it("sets the badge for a positive count and clears it at zero", () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined)
    const clearAppBadge = vi.fn().mockResolvedValue(undefined)
    applyAppBadge(3, { setAppBadge, clearAppBadge })
    expect(setAppBadge).toHaveBeenCalledWith(3)
    applyAppBadge(0, { setAppBadge, clearAppBadge })
    expect(clearAppBadge).toHaveBeenCalled()
  })

  it("is a no-op without the API or a navigator at all", () => {
    expect(() => applyAppBadge(5, {})).not.toThrow()
    expect(() => applyAppBadge(5, undefined)).not.toThrow()
  })

  it("swallows rejections — the badge must never break the page", async () => {
    const setAppBadge = vi.fn().mockRejectedValue(new Error("denied"))
    expect(() => applyAppBadge(1, { setAppBadge })).not.toThrow()
    await Promise.resolve() // let the rejection settle through the catch
  })
})

describe("clearShellCache", () => {
  it("posts the clear message to the active hub service worker", async () => {
    const postMessage = vi.fn()
    const getRegistration = vi.fn().mockResolvedValue({ active: { postMessage } })
    clearShellCache({ serviceWorker: { getRegistration } as unknown as ServiceWorkerContainer })
    expect(getRegistration).toHaveBeenCalledWith("/hub")
    await Promise.resolve()
    expect(postMessage).toHaveBeenCalledWith("hauldesk-clear-shell")
  })

  it("is a no-op without a service worker", () => {
    expect(() => clearShellCache({})).not.toThrow()
    expect(() => clearShellCache(undefined)).not.toThrow()
  })
})
