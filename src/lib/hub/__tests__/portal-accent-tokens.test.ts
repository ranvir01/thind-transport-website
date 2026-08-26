/**
 * Portal pages must follow the carrier's accent color (--portal-accent) instead
 * of Thind's marketing gold bleeding into a white-label portal surface.
 * Regressions fixed so far: the load detail page's Documents list FileText icon,
 * the portal home page's "Moving now" list position hint, the invoice status
 * pill/amount, the shared LoadProgressBar/StopTimeline components used by both
 * /hub/portal and the public /track/[token] page (all were hardcoded
 * text-gold/bg-gold despite a sibling element already using the accent var),
 * and the quote form's CTA buttons (which used the internal ops `bg-accent`/
 * `text-accent-fg` tokens — mode-dependent on the office theme toggle, not the
 * carrier's --portal-accent), and the sessionless accept/[token] invitation
 * page (its "sign in here" link was hardcoded text-gold and its form button
 * used the same internal ops bg-accent/text-accent-fg tokens as the quote
 * form, even though the page has the invitation's carrier_id available to
 * resolve the real accent, same trick as /track/[token]). See AGENTS.md's
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
const QUOTE_FORM_SOURCE = readFileSync(
  join(__dirname, "../../../components/hub/PortalQuoteForm.tsx"),
  "utf-8"
)
const ACCEPT_PAGE_SOURCE = readFileSync(
  join(__dirname, "../../../app/hub/portal/accept/[token]/page.tsx"),
  "utf-8"
)
const ACCEPT_FORM_SOURCE = readFileSync(
  join(__dirname, "../../../components/hub/AcceptInvitationForm.tsx"),
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

  it("the invoice status pill and amount follow the carrier's accent color, not stock gold", () => {
    expect(HOME_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(HOME_SOURCE).toMatch(/var\(--portal-accent\)/)
  })

  it("the family-gate subtitle is always-on, outside broker/shipper and empty-state branches", () => {
    const gate = HOME_SOURCE.indexOf("no checking calls needed")
    const shipperBranch = HOME_SOURCE.indexOf("{user.portalRole === \"shipper\"")
    expect(gate).toBeGreaterThan(-1)
    expect(shipperBranch).toBeGreaterThan(gate)
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

describe("portal quote form accent tokens", () => {
  it("the CTA buttons follow --portal-accent, not the internal ops bg-accent/text-accent-fg tokens", () => {
    expect(QUOTE_FORM_SOURCE).not.toMatch(/bg-accent\b|text-accent-fg\b|bg-accent-hover\b/)
    expect(QUOTE_FORM_SOURCE).toMatch(/var\(--portal-accent\)/)
  })
})

describe("accept invitation page + form accent tokens (sessionless, resolves via invitation.carrier_id)", () => {
  it("the page resolves the carrier's accent instead of the layout's sessionless default", () => {
    expect(ACCEPT_PAGE_SOURCE).toMatch(/resolvePortalAccent\(s\.branding\.accent\)/)
    expect(ACCEPT_PAGE_SOURCE).toMatch(/"--portal-accent":\s*accent\.text/)
  })

  it("the already-used sign-in link follows --portal-accent, not hardcoded gold", () => {
    expect(ACCEPT_PAGE_SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
    expect(ACCEPT_PAGE_SOURCE).toMatch(/var\(--portal-accent\)/)
  })

  it("the form's submit button follows --portal-accent, not the internal ops bg-accent/text-accent-fg tokens", () => {
    expect(ACCEPT_FORM_SOURCE).not.toMatch(/bg-accent\b|text-accent-fg\b|bg-accent-hover\b/)
    expect(ACCEPT_FORM_SOURCE).toMatch(/var\(--portal-accent\)/)
  })

  it("the card kicker is family-gate copy outside the invitation-state ternary", () => {
    const kicker = ACCEPT_PAGE_SOURCE.indexOf("Portal invitation")
    const ternary = ACCEPT_PAGE_SOURCE.indexOf("{!invitation")
    expect(kicker).toBeGreaterThan(-1)
    expect(ternary).toBeGreaterThan(kicker)
  })
})
