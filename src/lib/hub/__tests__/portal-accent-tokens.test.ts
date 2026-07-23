/**
 * Portal pages must follow the carrier's accent color (--portal-accent) instead
 * of Thind's marketing gold bleeding into a white-label portal surface.
 * Regressions fixed so far: the load detail page's Documents list FileText icon,
 * the portal home page's "Moving now" list position hint, and the shared
 * LoadProgressBar/StopTimeline components used by both /hub/portal and the
 * public /track/[token] page (all were hardcoded text-gold/bg-gold despite a
 * sibling element already using the accent var). See AGENTS.md's
 * semantic-token doctrine.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LOAD_DETAIL_SOURCE = readFileSync(
  join(__dirname, "../../../app/hub/portal/loads/[id]/page.tsx"),
  "utf-8"
)
const HOME_SOURCE = readFileSync(join(__dirname, "../../../app/hub/portal/page.tsx"), "utf-8")
const TRACK_SOURCE = readFileSync(join(__dirname, "../../../app/track/[token]/page.tsx"), "utf-8")
const PROGRESS_BAR_SOURCE = readFileSync(
  join(__dirname, "../../../components/hub/LoadProgressBar.tsx"),
  "utf-8"
)
const STOP_TIMELINE_SOURCE = readFileSync(
  join(__dirname, "../../../components/hub/StopTimeline.tsx"),
  "utf-8"
)

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

describe("shared progress/timeline components (portal + public track)", () => {
  it("LoadProgressBar's filled segments follow --portal-accent, not hardcoded gold", () => {
    expect(PROGRESS_BAR_SOURCE).not.toMatch(/bg-gold/)
    expect(PROGRESS_BAR_SOURCE).toMatch(/var\(--portal-accent\)/)
  })

  it("StopTimeline's arrived badge follows --portal-accent, not hardcoded gold", () => {
    expect(STOP_TIMELINE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(STOP_TIMELINE_SOURCE).toMatch(/var\(--portal-accent\)/)
  })

  it("the public track page sets --portal-accent so the shared components resolve the carrier's color", () => {
    expect(TRACK_SOURCE).toMatch(/"--portal-accent":\s*accent\.text/)
  })
})
