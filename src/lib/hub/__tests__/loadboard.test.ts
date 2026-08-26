import { describe, expect, it } from "vitest"
import { exportLoadsCsv } from "../loadboard-export"
import type { Load } from "../types"

describe("exportLoadsCsv", () => {
  const sample: Load = {
    id: "a",
    carrier_id: "c",
    reference: "THD-1001",
    customer_reference: "BR-99",
    customer_id: "cust",
    status: "booked",
    equipment: "dry_van",
    commodity: null,
    weight_lbs: null,
    linehaul_cents: 250000,
    fuel_surcharge_cents: 5000,
    accessorials: [],
    loaded_miles: 1200,
    deadhead_miles: null,
    truck_id: null,
    trailer_id: null,
    driver_id: null,
    dispatcher_id: null,
    source: "direct",
    factored: false,
    settlement_id: null,
    notes: 'Note with "quotes"',
    acknowledged_at: null,
    delivered_at: null,
    pod_received_at: null,
    created_at: "2026-01-01",
    customer_name: "Acme Broker",
    driver_name: "John Smith",
    truck_unit: "42",
    origin_city: "Kent",
    origin_state: "WA",
    dest_city: "Boise",
    dest_state: "ID",
    pickup_appt: "2026-06-15T08:00:00.000Z",
  }

  it("exports headers and escaped values", () => {
    const csv = exportLoadsCsv([sample])
    const lines = csv.split("\n")
    expect(lines[0]).toContain("Ref")
    expect(lines[0]).toContain("Broker #")
    expect(lines[1]).toContain("THD-1001")
    expect(lines[1]).toContain("Acme Broker")
    expect(lines[1]).toContain('"Note with ""quotes"""')
  })

  it("formats money as dollars", () => {
    const csv = exportLoadsCsv([sample])
    expect(csv).toContain("2500.00")
    expect(csv).toContain("50.00")
    expect(csv).toContain("2550.00")
  })
})
