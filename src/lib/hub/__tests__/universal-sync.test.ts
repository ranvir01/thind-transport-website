/**
 * Universal-coverage sync clients — the pure normalizers, which are the one
 * place each provider's assumed response shape lives. When a real sandbox
 * payload arrives, these fixtures get replaced with captured ones and the
 * assertions stay; nothing else in the adapter changes (the efs.ts pattern).
 */
import { describe, expect, it } from "vitest"
import {
  normalizeAtobRecord,
  normalizeFleetioRecord,
  normalizePlaidRecord,
  normalizeSambaRecord,
  normalizeTollRecord,
} from "../integrations/universal-sync"

describe("normalizeAtobRecord", () => {
  it("maps the assumed AtoB transaction shape to integer cents", () => {
    const row = normalizeAtobRecord({
      id: "txn_9",
      transacted_at: "2026-08-01T14:22:00Z",
      vehicle_name: "102",
      merchant_name: "Pilot #482",
      merchant_city: "Ellensburg",
      merchant_state: "WA",
      quantity: 118.42,
      price_per_gallon: 3.899,
      amount: 461.72,
    })
    expect(row.external_id).toBe("txn_9")
    expect(row.unitHint).toBe("102")
    expect(row.jurisdiction).toBe("WA")
    expect(row.gallons).toBeCloseTo(118.42)
    expect(row.unitPriceCents).toBe(390) // dollarsToCents rounds
    expect(row.totalCents).toBe(46172)
  })

  it("a record with no id yields an empty external_id the ingest refuses", () => {
    expect(normalizeAtobRecord({ amount: 10 }).external_id).toBe("")
  })
})

describe("normalizePlaidRecord — the bank feed is NOT all fuel", () => {
  it("keeps a truck-stop charge, gallons honestly zero", () => {
    const row = normalizePlaidRecord({
      transaction_id: "p1",
      name: "LOVE'S TRAVEL STOP #348",
      amount: 512.4,
      date: "2026-08-01",
      location: { city: "Baker City", region: "OR" },
    })
    expect(row).not.toBeNull()
    expect(row!.gallons).toBe(0)
    expect(row!.totalCents).toBe(51240)
    expect(row!.jurisdiction).toBe("OR")
    expect(row!.unitHint).toBeNull() // a bank row cannot know the truck
  })

  it("drops lunch, drops refunds", () => {
    expect(normalizePlaidRecord({ transaction_id: "p2", name: "SUBWAY 4021", amount: 14.5 })).toBeNull()
    expect(normalizePlaidRecord({ transaction_id: "p3", name: "PILOT #482", amount: -461.72 })).toBeNull()
  })

  it("category can qualify a merchant the name regex misses", () => {
    const row = normalizePlaidRecord({
      transaction_id: "p4",
      name: "COUNTRY CORNER",
      category: ["Travel", "Gas Stations"],
      amount: 220,
    })
    expect(row).not.toBeNull()
  })
})

describe("normalizeTollRecord (Bestpass / PrePass)", () => {
  it("maps plaza, transponder, jurisdiction and cents", () => {
    const row = normalizeTollRecord({
      id: "t1",
      transaction_date: "2026-08-02T09:00:00Z",
      vehicle: "104",
      transponder: "BP-99871",
      plaza: "Tacoma Narrows EB",
      state: "WA",
      amount: 7.0,
    })
    expect(row).toMatchObject({
      external_id: "t1",
      unitHint: "104",
      transponder: "BP-99871",
      plaza: "Tacoma Narrows EB",
      jurisdiction: "WA",
      amountCents: 700,
    })
  })
})

describe("normalizeFleetioRecord", () => {
  it("maps a completed service entry", () => {
    const row = normalizeFleetioRecord({
      id: 88123,
      completed_at: "2026-07-30T18:00:00Z",
      vehicle: { name: "101" },
      vendor_name: "Kent Truck Repair",
      total_amount: 1284.5,
      description: "PM service + brake adjustment",
    })
    expect(row.external_id).toBe("88123")
    expect(row.unitHint).toBe("101")
    expect(row.doneOn).toBe("2026-07-30")
    expect(row.costCents).toBe(128450)
  })
})

describe("normalizeSambaRecord", () => {
  it("maps an MVR alert with a driver name", () => {
    const row = normalizeSambaRecord({
      alert_id: "a-42",
      description: "CDL status changed to SUSPENDED",
      driver: { first_name: "Manny", last_name: "Gill" },
    })
    expect(row.external_id).toBe("a-42")
    expect(row.driverNameHint).toBe("Manny Gill")
    expect(row.headline).toContain("SUSPENDED")
  })
})
