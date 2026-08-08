import { describe, expect, it } from "vitest"
import {
  HUB_UTILITY_LINKS,
  allHubRoutes,
  hubPrimarySections,
  hubUtilityLinks,
  isNavActive,
} from "../navigation"

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

// Ported from the finalize-pass handoff (patch 0005): the per-call trim is the
// multi-tenant contract — one carrier full surface, another trimmed, same
// process. A regression back to module-level env trimming breaks these.
describe("small-carrier trim is per-call, not fleet-global", () => {
  it("full mode surfaces the utility screens small-carrier hides", () => {
    const trimmed = new Set(hubUtilityLinks(true).map((l) => l.href))
    const full = new Set(hubUtilityLinks(false).map((l) => l.href))
    expect(full.has("/hub/tasks")).toBe(true)
    expect(trimmed.has("/hub/tasks")).toBe(false)
    expect(full.size).toBeGreaterThan(trimmed.size)
  })

  it("primary sections regain hidden sub-links in full mode", () => {
    const fullSubs = hubPrimarySections(false).flatMap((s) => s.sub.map((l) => l.href))
    const trimmedSubs = hubPrimarySections(true).flatMap((s) => s.sub.map((l) => l.href))
    expect(fullSubs).toContain("/hub/recruiting")
    expect(trimmedSubs).not.toContain("/hub/recruiting")
  })

  it("⌘K follows the same per-carrier flag", () => {
    const full = allHubRoutes(true, false)
    const trimmed = allHubRoutes(true, true)
    expect(full.length).toBeGreaterThan(trimmed.length)
    expect(trimmed.some((r) => r.href === "/hub/toolbox")).toBe(true)
  })
})
