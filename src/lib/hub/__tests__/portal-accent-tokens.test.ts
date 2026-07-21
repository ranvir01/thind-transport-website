/**
 * Portal load detail page must follow the carrier's accent color (--portal-accent),
 * matching the status badge and position hint. Regression: the Documents list's
 * FileText icon was still hardcoded text-gold — Thind's marketing gold bleeding
 * into a white-label portal surface. See AGENTS.md's semantic-token doctrine.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SOURCE = readFileSync(
  join(__dirname, "../../../app/hub/portal/loads/[id]/page.tsx"),
  "utf-8"
)

describe("portal load detail accent tokens", () => {
  it("never hardcodes Thind gold on the carrier-branded portal surface", () => {
    expect(SOURCE).not.toMatch(/text-gold|bg-gold|border-gold/)
  })

  it("the Documents list icon follows the carrier's accent color", () => {
    expect(SOURCE).toMatch(/FileText className="[^"]*var\(--portal-accent\)/)
  })
})
