import { describe, expect, it } from "vitest"
import { normalizeEfsRow } from "../integrations/efs"

describe("EFS feed row normalization", () => {
  it("maps the documented feed shape into cents-based, carrier-schema fields", () => {
    const row = normalizeEfsRow({
      transactionId: "TXN-9001",
      transactionDate: "2026-07-01T14:30:00Z",
      unitNumber: "T-104",
      merchantName: "Pilot #412",
      city: "Laramie",
      state: "wy",
      gallons: 112.4,
      pricePerGallon: 3.799,
      totalAmount: 427.05,
      odometer: 214830,
    })
    expect(row).toEqual({
      external_id: "TXN-9001",
      ts: "2026-07-01T14:30:00Z",
      unitHint: "T-104",
      merchant: "Pilot #412",
      city: "Laramie",
      jurisdiction: "WY",
      gallons: 112.4,
      unitPriceCents: 380,
      totalCents: 42705,
      odometer: 214830,
    })
  })

  it("falls back safely when optional fields are missing or malformed", () => {
    const row = normalizeEfsRow({ id: "TXN-1", totalAmount: "not-a-number" })
    expect(row.external_id).toBe("TXN-1")
    expect(row.unitHint).toBeNull()
    expect(row.jurisdiction).toBeNull()
    expect(row.gallons).toBe(0)
    expect(row.unitPriceCents).toBeNull()
    expect(row.totalCents).toBe(0)
    expect(row.odometer).toBeNull()
  })

  it("prefers vehicleId when unitNumber is absent", () => {
    const row = normalizeEfsRow({ transactionId: "TXN-2", vehicleId: "V-77" })
    expect(row.unitHint).toBe("V-77")
  })
})
