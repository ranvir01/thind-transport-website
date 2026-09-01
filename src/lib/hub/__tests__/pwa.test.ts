import { describe, expect, it, vi } from "vitest"
import { applyAppBadge, canShareLinks, clearShellCache, shareLink } from "../pwa"

describe("shareLink", () => {
  const data = { title: "Load tracking", url: "https://example.com/track/abc" }

  it("opens the native sheet when the device has one", async () => {
    const share = vi.fn(async () => {})
    const writeText = vi.fn(async () => {})
    expect(await shareLink(data, { share, clipboard: { writeText } })).toBe("shared")
    expect(share).toHaveBeenCalledWith(data)
    expect(writeText).not.toHaveBeenCalled()
  })

  it("treats closing the sheet as cancelled, not failure — and copies nothing", async () => {
    const share = vi.fn(async () => {
      throw Object.assign(new Error("closed"), { name: "AbortError" })
    })
    const writeText = vi.fn(async () => {})
    expect(await shareLink(data, { share, clipboard: { writeText } })).toBe("cancelled")
    expect(writeText).not.toHaveBeenCalled()
  })

  it("falls back to the clipboard where there is no sheet, or the sheet refuses the data", async () => {
    const writeText = vi.fn(async () => {})
    expect(await shareLink(data, { clipboard: { writeText } })).toBe("copied")
    expect(writeText).toHaveBeenCalledWith(data.url)
    const share = vi.fn(async () => {})
    expect(await shareLink(data, { share, canShare: () => false, clipboard: { writeText } })).toBe("copied")
    expect(share).not.toHaveBeenCalled()
  })

  it("reports failure when neither route exists or the clipboard rejects", async () => {
    expect(await shareLink(data, {})).toBe("failed")
    expect(await shareLink(data, undefined)).toBe("failed")
    const writeText = vi.fn(async () => {
      throw new Error("denied")
    })
    expect(await shareLink(data, { clipboard: { writeText } })).toBe("failed")
  })

  it("canShareLinks is a plain capability check", () => {
    expect(canShareLinks({ share: async () => {} })).toBe(true)
    expect(canShareLinks({})).toBe(false)
    expect(canShareLinks(undefined)).toBe(false)
  })
})

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
