/**
 * Toolbox registry invariants. The one that matters most: "frame" is a
 * promise the page renders inside an iframe, and only our own origin can
 * keep it — an external site promoted to "frame" without header verification
 * would ship a grey refusal box where a tool should be.
 */
import { describe, expect, it } from "vitest"
import { WORKBENCH_GROUPS, WORKBENCH_RESOURCES } from "../workbench"

describe("workbench registry", () => {
  it("ids are unique and every field is filled", () => {
    const ids = WORKBENCH_RESOURCES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of WORKBENCH_RESOURCES) {
      expect(r.label.length, r.id).toBeGreaterThan(2)
      expect(r.blurb.length, r.id).toBeGreaterThan(10)
    }
  })

  it('"frame" is same-origin, or an external host verified frameable on a recorded date', () => {
    // External hosts whose response headers were verified to permit
    // cross-origin framing (no XFO, no frame-ancestors restriction), with the
    // verification date. Evidence: securityheaders.com scans 2026-08-07
    // (docs/research prompt-5 embeddability report); re-check with
    // scripts/verify-frame-headers.mjs before adding a host or trusting an
    // old date. eCFR, FMCSA, Idaho 511 and iftach.org all BLOCK framing —
    // they must never appear here.
    const FRAME_VERIFIED_HOSTS = new Map([
      ["wsdot.com", "2026-08-07"],
      ["www.tripcheck.com", "2026-08-07"],
      ["www.weather.gov", "2026-08-07"],
      ["www.eia.gov", "2026-08-07"],
    ])
    for (const r of WORKBENCH_RESOURCES) {
      if (r.embed === "frame") {
        if (r.url.startsWith("/")) continue
        const host = new URL(r.url).hostname
        expect(
          FRAME_VERIFIED_HOSTS.has(host),
          `${r.id}: external frame for ${host} without header verification`
        ).toBe(true)
        expect(r.frameVerified, `${r.id}: external frame rows must record their verification date`).toBe(
          FRAME_VERIFIED_HOSTS.get(host)
        )
      } else {
        expect(r.url.startsWith("https://"), `${r.id}: sheets must be https`).toBe(true)
      }
    }
  })

  it("every group in the render order actually has resources, and vice versa", () => {
    const used = new Set(WORKBENCH_RESOURCES.map((r) => r.group))
    for (const g of WORKBENCH_GROUPS) expect(used.has(g), g).toBe(true)
    for (const g of used) expect(WORKBENCH_GROUPS.includes(g), g).toBe(true)
  })

  it("external resources are official sources only — no ad-funded mirrors", () => {
    const OFFICIAL = /\.(gov|com|org)$/
    const ALLOWED_HOSTS = new Set([
      "www.ecfr.gov", "eld.fmcsa.dot.gov", "safer.fmcsa.dot.gov", "www.eia.gov",
      "www.weather.gov", "wsdot.com", "www.tripcheck.com", "511.idaho.gov", "www.iftach.org",
    ])
    // ALL external resources — framed or sheeted — stay on the curated list;
    // a framed external that drifted off it would be worse, not exempt.
    for (const r of WORKBENCH_RESOURCES.filter((r) => r.url.startsWith("https://"))) {
      const host = new URL(r.url).hostname
      expect(ALLOWED_HOSTS.has(host), `${r.id}: ${host} is not on the curated official-source list`).toBe(true)
      expect(OFFICIAL.test(host), r.id).toBe(true)
    }
  })
})
