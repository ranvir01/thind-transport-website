import { describe, expect, it } from "vitest"
import { normalizeComdataRow } from "../integrations/comdata"

describe("Comdata feed row normalization", () => {
  it("maps the documented feed shape into cents-based, carrier-schema fields", () => {
    const row = normalizeComdataRow({
      transactionId: "CD-5001",
      postedDate: "2026-07-02T09:15:00Z",
      truckNumber: "T-220",
      merchant: "Loves #88",
      city: "Cheyenne",
      state: "wy",
      quantity: 98.2,
      unitPrice: 3.649,
      amount: 358.35,
      odometer: 301220,
    })
    expect(row).toEqual({
      external_id: "CD-5001",
      ts: "2026-07-02T09:15:00Z",
      unitHint: "T-220",
      merchant: "Loves #88",
      city: "Cheyenne",
      jurisdiction: "WY",
      gallons: 98.2,
      unitPriceCents: 365,
      totalCents: 35835,
      odometer: 301220,
    })
  })

  it("falls back safely when optional fields are missing or malformed", () => {
    const row = normalizeComdataRow({ id: "CD-1", amount: "not-a-number" })
    expect(row.external_id).toBe("CD-1")
    expect(row.unitHint).toBeNull()
    expect(row.jurisdiction).toBeNull()
    expect(row.gallons).toBe(0)
    expect(row.unitPriceCents).toBeNull()
    expect(row.totalCents).toBe(0)
    expect(row.odometer).toBeNull()
  })

  it("prefers unitId when truckNumber is absent", () => {
    const row = normalizeComdataRow({ transactionId: "CD-2", unitId: "U-9" })
    expect(row.unitHint).toBe("U-9")
  })
})
