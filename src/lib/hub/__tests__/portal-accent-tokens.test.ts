/**
 * Portal pages must follow the carrier's accent color (--portal-accent) instead
 * of Thind's marketing gold bleeding into a white-label portal surface.
 * Regressions fixed so far: the load detail page's Documents list FileText icon,
 * and the portal home page's "Moving now" list position hint (both were
 * hardcoded text-gold despite the sibling status badge/header already using
 * the accent var). See AGENTS.md's semantic-token doctrine.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LOAD_DETAIL_SOURCE = readFileSync(
  join(__dirname, "../../../app/hub/portal/loads/[id]/page.tsx"),
  "utf-8"
)
const HOME_SOURCE = readFileSync(join(__dirname, "../../../app/hub/portal/page.tsx"), "utf-8")

describe("portal load detail accent tokens", () => {
  it("never hardcodes Thind gold on the carrier-branded portal surface", () => {
    expect(LOAD_DETAIL_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
  })

  it("the Documents list icon follows the carrier's accent color", () => {
    expect(LOAD_DETAIL_SOURCE).toMatch(/FileText className="[^"]*var\(--portal-accent\)/)
  })
})

describe("portal home page accent tokens", () => {
  it("the Moving now list's position hint follows the carrier's accent color, not stock gold", () => {
    expect(HOME_SOURCE).toMatch(/text-body-xs text-\[color:var\(--portal-accent\)\]">\{load\.position_hint\}/)
  })
})
