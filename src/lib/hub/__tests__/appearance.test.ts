import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { APPEARANCE_LABELS, applyAppearance, readAppearance } from "../appearance"

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
}

describe("readAppearance (SSR, no window)", () => {
  it("falls back to light/indigo without touching localStorage", () => {
    expect(readAppearance()).toEqual({ mode: "light", theme: "indigo" })
  })
})

describe("appearance in a browser-like environment", () => {
  let attributes: Record<string, string>
  let storage: MemoryStorage

  beforeEach(() => {
    attributes = {}
    storage = new MemoryStorage()
    ;(globalThis as any).window = {}
    ;(globalThis as any).localStorage = storage
    ;(globalThis as any).document = {
      documentElement: {
        setAttribute(name: string, value: string) {
          attributes[name] = value
        },
      },
    }
  })

  afterEach(() => {
    delete (globalThis as any).window
    delete (globalThis as any).localStorage
    delete (globalThis as any).document
  })

  it("readAppearance defaults to light/indigo when nothing is stored", () => {
    expect(readAppearance()).toEqual({ mode: "light", theme: "indigo" })
  })

  it("readAppearance reads back a previously stored mode/theme", () => {
    storage.setItem("hauldesk-mode", "dark")
    storage.setItem("hauldesk-theme", "teal")
    expect(readAppearance()).toEqual({ mode: "dark", theme: "teal" })
  })

  it("applyAppearance stamps data-app/data-mode/data-theme on <html>", () => {
    applyAppearance("dark", "ink")
    expect(attributes).toEqual({ "data-app": "hauldesk", "data-mode": "dark", "data-theme": "ink" })
  })

  it("applyAppearance persists mode/theme so readAppearance sees them after", () => {
    applyAppearance("dark", "teal")
    expect(readAppearance()).toEqual({ mode: "dark", theme: "teal" })
  })

  it("applyAppearance overwrites a previously persisted appearance", () => {
    applyAppearance("dark", "ink")
    applyAppearance("light", "indigo")
    expect(readAppearance()).toEqual({ mode: "light", theme: "indigo" })
    expect(attributes["data-mode"]).toBe("light")
    expect(attributes["data-theme"]).toBe("indigo")
  })
})

describe("APPEARANCE_LABELS", () => {
  it("has a human label for every accent theme", () => {
    expect(APPEARANCE_LABELS).toEqual({ indigo: "Indigo", teal: "Teal", ink: "Ink" })
  })
})
