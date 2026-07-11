import { describe, expect, it } from "vitest"
import { HUB_UTILITY_LINKS, allHubRoutes, isNavActive } from "../navigation"

describe("isNavActive", () => {
  it("highlights Money overview only on the overview route", () => {
    expect(isNavActive("/hub/money", "/hub/money")).toBe(true)
    expect(isNavActive("/hub/money/invoices", "/hub/money")).toBe(false)
    expect(isNavActive("/hub/money/settlements/abc", "/hub/money")).toBe(false)
  })

  it("highlights money sub-pages with prefix match", () => {
    expect(isNavActive("/hub/money/invoices", "/hub/money/invoices")).toBe(true)
    expect(isNavActive("/hub/money/invoices/abc", "/hub/money/invoices")).toBe(true)
    expect(isNavActive("/hub/money", "/hub/money/invoices")).toBe(false)
  })
})

describe("team phone app entry", () => {
  it("exposes /hub/settings/app to every office role, even in small-carrier mode", () => {
    const link = HUB_UTILITY_LINKS.find((l) => l.href === "/hub/settings/app")
    expect(link).toBeDefined()
    expect(link?.ownerOnly).toBeFalsy()
  })

  it("reaches the ⌘K palette for non-owners", () => {
    const routes = allHubRoutes(false)
    expect(routes.some((r) => r.href === "/hub/settings/app")).toBe(true)
  })
})
