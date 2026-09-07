import { afterEach, describe, expect, it, vi } from "vitest"
import { copyTextToClipboard } from "@/lib/copy-text"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("copyTextToClipboard", () => {
  it("uses navigator.clipboard.writeText when it resolves", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    await expect(copyTextToClipboard("hi")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("hi")
  })

  it("falls back to execCommand when clipboard.writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const exec = vi.fn().mockReturnValue(true)
    const textarea = {
      value: "",
      setAttribute: vi.fn(),
      style: {} as CSSStyleDeclaration,
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
    }
    vi.stubGlobal("document", {
      createElement: vi.fn(() => textarea),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: exec,
    })
    await expect(copyTextToClipboard("whatsapp body")).resolves.toBe(true)
    expect(textarea.value).toBe("whatsapp body")
    expect(exec).toHaveBeenCalledWith("copy")
  })

  it("returns false when both clipboard and execCommand are unavailable", async () => {
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("document", undefined)
    await expect(copyTextToClipboard("x")).resolves.toBe(false)
  })
})
