/**
 * Tenant accent (carrier_settings.branding.accent) drives the PDF title-bar
 * color instead of the hardcoded Thind gold. Regression: PdfBrand carried
 * dot/mc/etc. for years but no accent field, so setBrandAccentAction's write
 * had nowhere to render — see branding-settings.test.ts for the settings half.
 */
import { describe, expect, it } from "vitest"
import { buildIftaPdf, buildInvoicePdf, buildSettlementPdf, buildStatementPdf, resolveAccentColor } from "../pdf"

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

  it("renders different bytes for two different accents, all else equal", async () => {
    const blue = await buildInvoicePdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    const red = await buildInvoicePdf({ brand: { name: "Cascade Demo Lines", accent: "#DC2626" }, ...base })
    expect(Buffer.compare(blue, red)).not.toBe(0)
  })
})

/**
 * buildInvoicePdf was the only builder pinned above even though
 * buildStatementPdf/buildSettlementPdf/buildIftaPdf all route through the
 * same header()/resolveAccentColor() path with their own `brand` input —
 * an untested title-bar accent gap for 3 of the 4 shipped document types.
 * "Builds" alone isn't enough to prove the accent is wired per-builder, so
 * these also diff two accent-only variants of the same document.
 */
describe("buildStatementPdf with tenant accent", () => {
  const base = {
    customerName: "Cascade Produce Co.",
    statementDate: "2026-07-03",
    invoices: [{ number: "THD-INV-1", loadReference: "THD-1008", dueOn: "2026-08-02", bucket: "current", openCents: 100000 }],
    totalOpenCents: 100000,
  }

  it("builds successfully with a valid tenant accent", async () => {
    const bytes = await buildStatementPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("renders different bytes for two different accents, all else equal", async () => {
    const blue = await buildStatementPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    const red = await buildStatementPdf({ brand: { name: "Cascade Demo Lines", accent: "#DC2626" }, ...base })
    expect(Buffer.compare(blue, red)).not.toBe(0)
  })
})

describe("buildSettlementPdf with tenant accent", () => {
  const base = {
    driverName: "Jasdeep Singh",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-07",
    lines: [{ kind: "pay", label: "Linehaul", amountCents: 100000 }],
    grossCents: 100000,
    deductionsCents: 0,
    netCents: 100000,
  }

  it("builds successfully with a valid tenant accent", async () => {
    const bytes = await buildSettlementPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("renders different bytes for two different accents, all else equal", async () => {
    const blue = await buildSettlementPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    const red = await buildSettlementPdf({ brand: { name: "Cascade Demo Lines", accent: "#DC2626" }, ...base })
    expect(Buffer.compare(blue, red)).not.toBe(0)
  })
})

describe("buildIftaPdf with tenant accent", () => {
  const base = {
    quarter: "2026-Q2",
    mileageSource: "ELD",
    fleetMiles: 10000,
    fleetGallons: 1500,
    mpg: 6.6667,
    rows: [{ jurisdiction: "WA", miles: 10000, taxableGallons: 1500, taxPaidGallons: 1500, rate: 0.494, surchargeRate: 0, netCents: 0 }],
    netTaxCents: 0,
  }

  it("builds successfully with a valid tenant accent", async () => {
    const bytes = await buildIftaPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    expect(bytes.length).toBeGreaterThan(1000)
  })

  it("renders different bytes for two different accents, all else equal", async () => {
    const blue = await buildIftaPdf({ brand: { name: "Cascade Demo Lines", accent: "#2563EB" }, ...base })
    const red = await buildIftaPdf({ brand: { name: "Cascade Demo Lines", accent: "#DC2626" }, ...base })
    expect(Buffer.compare(blue, red)).not.toBe(0)
  })
})
