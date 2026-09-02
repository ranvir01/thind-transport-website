/**
 * The driver home + docs pages showed CDL/medical-card expiry dates via
 * @/components/hub/ui's ExpiryPill, which colors its ok/warn/bad tones with
 * office semantic tokens (bg-ok-soft/text-ok etc.) that default to their
 * light-mode values on the driver app's forced-dark bg-navy chrome — a pale
 * mint/amber/red chip floating on an otherwise all-dark screen. AGENTS.md:
 * no mode-dependent tokens on forced-dark surfaces. Fixed by DriverExpiryPill
 * (fixed green/orange/red palette, same day-math).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const HOME_PAGE_SOURCE = readFileSync(join(__dirname, "../../../../app/hub/driver/page.tsx"), "utf-8")
const DOCS_PAGE_SOURCE = readFileSync(join(__dirname, "../../../../app/hub/driver/docs/page.tsx"), "utf-8")
const EXPIRY_PILL_SOURCE = readFileSync(join(__dirname, "../ExpiryPill.tsx"), "utf-8")

describe("driver expiry pill uses the fixed dark palette, not office semantic tokens", () => {
  it("home page does not import the office ExpiryPill", () => {
    expect(HOME_PAGE_SOURCE).not.toMatch(/ExpiryPill.*from "@\/components\/hub\/ui"/)
    expect(HOME_PAGE_SOURCE).toMatch(/DriverExpiryPill/)
  })

  it("docs page does not import the office ExpiryPill", () => {
    expect(DOCS_PAGE_SOURCE).not.toMatch(/ExpiryPill.*from "@\/components\/hub\/ui"/)
    expect(DOCS_PAGE_SOURCE).toMatch(/DriverExpiryPill/)
  })

  it("DriverExpiryPill never renders bg-ok-soft/bg-warn-soft/bg-bad-soft or text-ok/text-warn/text-bad", () => {
    expect(EXPIRY_PILL_SOURCE).not.toMatch(/bg-(ok|warn|bad)-soft|text-(ok|warn|bad)\b/)
  })

  it("DriverExpiryPill uses fixed literal colors for every tone", () => {
    expect(EXPIRY_PILL_SOURCE).toMatch(/bg-red-500\/20 text-red-300/)
    expect(EXPIRY_PILL_SOURCE).toMatch(/bg-orange-500\/15 text-orange-300/)
    expect(EXPIRY_PILL_SOURCE).toMatch(/bg-green-500\/25 text-green-300/)
  })

  it("the warn tone never uses the bare brand red as TEXT (≈3.7:1 on the dark card)", () => {
    // `text-orange` is the fill/edge red; only the -300 tint clears 4.5:1 here.
    expect(EXPIRY_PILL_SOURCE).not.toMatch(/text-orange(?![-\d])/)
  })

  it("a missing date renders a real pill, never a bare dash (DESIGN.md)", () => {
    expect(EXPIRY_PILL_SOURCE).toMatch(/No date/)
    expect(EXPIRY_PILL_SOURCE).not.toMatch(/>—</)
  })
})
