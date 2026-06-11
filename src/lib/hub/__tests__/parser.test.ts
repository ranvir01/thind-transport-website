import { describe, expect, it } from "vitest"
import { parseRateCon } from "../parser"

const SAMPLE_RATE_CON = `PACIFIC CREST LOGISTICS  MC# 784512
Rate Confirmation
Load # PCL-99120
Equipment: 53' Reefer
Commodity: Frozen vegetables
Weight: 42,000 lbs

PICKUP: Kent Cold Storage
Kent, WA 98032
06/12/2026 08:00

DELIVERY: Valley Distribution Center
Fresno, CA 93725
06/14/2026 14:00

Linehaul: $3,200.00
Fuel Surcharge: $350.00
Total: $3,550.00`

describe("rate confirmation parser", () => {
  const parsed = parseRateCon(SAMPLE_RATE_CON)

  it("finds the broker and MC number", () => {
    expect(parsed.mcNumber?.value).toBe("784512")
    expect(parsed.brokerName?.value).toContain("PACIFIC CREST")
  })

  it("finds the reference", () => {
    expect(parsed.reference?.value).toBe("PCL-99120")
  })

  it("parses money to exact cents", () => {
    expect(parsed.linehaulCents?.value).toBe(320000)
    expect(parsed.fuelSurchargeCents?.value).toBe(35000)
    expect(parsed.totalCents?.value).toBe(355000)
  })

  it("detects equipment, weight, commodity", () => {
    expect(parsed.equipment?.value).toBe("reefer")
    expect(parsed.weightLbs?.value).toBe(42000)
    expect(parsed.commodity?.value).toContain("Frozen vegetables")
  })

  it("extracts pickup and delivery stops with dates", () => {
    expect(parsed.stops.length).toBeGreaterThanOrEqual(2)
    const pickup = parsed.stops.find((s) => s.type === "pickup")
    const delivery = parsed.stops.find((s) => s.type === "delivery")
    expect(pickup).toMatchObject({ city: "Kent", state: "WA" })
    expect(pickup?.date).toBe("06/12/2026")
    expect(delivery).toMatchObject({ city: "Fresno", state: "CA" })
  })

  it("falls back to first city pairs when labels are missing", () => {
    const sparse = parseRateCon("Acme Brokerage\nSpokane, WA to Boise, ID\nRate: $1,800.00")
    expect(sparse.stops[0]).toMatchObject({ type: "pickup", city: "Spokane", state: "WA" })
    expect(sparse.stops[1]).toMatchObject({ type: "delivery", city: "Boise", state: "ID" })
    expect(sparse.linehaulCents?.value).toBe(180000)
  })
})
