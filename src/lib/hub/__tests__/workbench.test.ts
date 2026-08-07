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

  it('"frame" resources are same-origin paths; external ones are https sheets', () => {
    for (const r of WORKBENCH_RESOURCES) {
      if (r.embed === "frame") {
        expect(r.url.startsWith("/"), `${r.id}: frame promised for an external URL`).toBe(true)
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
    for (const r of WORKBENCH_RESOURCES.filter((r) => r.embed === "sheet")) {
      const host = new URL(r.url).hostname
      expect(ALLOWED_HOSTS.has(host), `${r.id}: ${host} is not on the curated official-source list`).toBe(true)
      expect(OFFICIAL.test(host), r.id).toBe(true)
    }
  })
})
