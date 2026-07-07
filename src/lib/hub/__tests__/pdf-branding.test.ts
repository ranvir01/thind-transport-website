/**
 * Tenant accent (carrier_settings.branding.accent) drives the PDF title-bar
 * color instead of the hardcoded Thind gold. Regression: PdfBrand carried
 * dot/mc/etc. for years but no accent field, so setBrandAccentAction's write
 * had nowhere to render — see branding-settings.test.ts for the settings half.
 */
import { describe, expect, it } from "vitest"
import { buildInvoicePdf, resolveAccentColor } from "../pdf"

describe("resolveAccentColor", () => {
  it("converts a validated #RRGGBB hex to normalized rgb", () => {
    expect(resolveAccentColor("#FF0000")).toEqual({ type: "RGB", red: 1, green: 0, blue: 0 })
    expect(resolveAccentColor("#000000")).toEqual({ type: "RGB", red: 0, green: 0, blue: 0 })
  })

  it("falls back to the Thind gold for null, undefined, or malformed input", () => {
    const gold = resolveAccentColor(null)
    expect(resolveAccentColor(undefined)).toEqual(gold)
    expect(resolveAccentColor("")).toEqual(gold)
    expect(resolveAccentColor("#fff")).toEqual(gold) // shorthand not accepted upstream either
    expect(resolveAccentColor("not-a-color")).toEqual(gold)
    expect(resolveAccentColor("javascript:alert(1)")).toEqual(gold)
  })
})

describe("buildInvoicePdf with tenant accent", () => {
  const base = {
    number: "THD-INV-1",
    issuedOn: "2026-07-03",
    dueOn: "2026-08-02",
    billTo: { name: "Cascade Produce Co." },
    loadReference: "THD-1008",
    lane: "Kent, WA -> Seattle, WA",
    lines: [{ label: "Linehaul", amountCents: 100000 }],
    totalCents: 100000,
    remitTo: "Thind Transport",
    factored: false,
  }

  it("builds successfully with a valid tenant accent", async () => {
    const bytes = await buildInvoicePdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("builds successfully when accent is unset (default gold)", async () => {
    const bytes = await buildInvoicePdf({ brand: { name: "Thind Transport" }, ...base })
    expect(bytes.length).toBeGreaterThan(1000)
  })
})
