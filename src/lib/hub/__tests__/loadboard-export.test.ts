import { describe, expect, it } from "vitest"
import { exportLoadsCsv } from "../loadboard-export"
import type { Load } from "../types"

function makeLoad(overrides: Partial<Load> = {}): Load {
  return {
    id: "load-1",
    carrier_id: "carrier-1",
    reference: "L-1001",
    customer_reference: null,
    customer_id: null,
    status: "booked",
    equipment: "dry_van",
    commodity: null,
    weight_lbs: null,
    linehaul_cents: 150000,
    fuel_surcharge_cents: 5000,
    accessorials: [],
    loaded_miles: 450,
    deadhead_miles: null,
    truck_id: null,
    trailer_id: null,
    driver_id: null,
    dispatcher_id: null,
    source: "direct",
    factored: false,
    settlement_id: null,
    notes: null,
    acknowledged_at: null,
    delivered_at: null,
    pod_received_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("exportLoadsCsv", () => {
  it("emits the header row followed by one row per load", () => {
    const csv = exportLoadsCsv([makeLoad()])
    const lines = csv.split("\n")
    expect(lines[0]).toBe(
      "Ref,Broker #,Status,Origin City,Origin ST,Dest City,Dest ST,Customer,Driver,Truck,Pickup,Linehaul,FSC,Miles,Total,Notes"
    )
    expect(lines).toHaveLength(2)
  })

  it("returns just the header for an empty load list", () => {
    const csv = exportLoadsCsv([])
    expect(csv.split("\n")).toHaveLength(1)
  })

  it("maps status codes to their display labels", () => {
    const csv = exportLoadsCsv([makeLoad({ status: "pod_received" })])
    expect(csv.split("\n")[1]).toContain("POD Received")
  })

  it("sums linehaul, FSC, and accessorials into the Total column", () => {
    const csv = exportLoadsCsv([
      makeLoad({
        linehaul_cents: 100000,
        fuel_surcharge_cents: 2500,
        accessorials: [
          { label: "Detention", amount_cents: 5000 },
          { label: "Lumper", amount_cents: 1500 },
        ],
      }),
    ])
    const cols = csv.split("\n")[1].split(",")
    // Linehaul, FSC, Miles, Total are the 12th-15th columns (1-indexed).
    expect(cols[11]).toBe("1000.00")
    expect(cols[12]).toBe("25.00")
    expect(cols[14]).toBe("1090.00")
  })

  it("renders nullable joined fields as empty strings", () => {
    const csv = exportLoadsCsv([
      makeLoad({
        customer_name: null,
        driver_name: null,
        truck_unit: null,
        origin_city: null,
        origin_state: null,
        dest_city: null,
        dest_state: null,
        pickup_appt: null,
        loaded_miles: null,
        notes: null,
      }),
    ])
    const cols = csv.split("\n")[1].split(",")
    expect(cols).toEqual([
      "L-1001", "", "Booked", "", "", "", "", "", "", "", "", "1500.00", "50.00", "", "1550.00", "",
    ])
  })

  it("formats the pickup appointment as a US short date", () => {
    const csv = exportLoadsCsv([makeLoad({ pickup_appt: "2026-03-15T14:00:00.000Z" })])
    const cols = csv.split("\n")[1].split(",")
    expect(cols[10]).toMatch(/^3\/1[45]\/2026$/)
  })

  it("blanks out an unparseable pickup appointment instead of throwing", () => {
    const csv = exportLoadsCsv([makeLoad({ pickup_appt: "not-a-date" })])
    expect(csv.split("\n")[1].split(",")[10]).toBe("")
  })

  it("quotes fields containing commas, quotes, or newlines per RFC 4180", () => {
    const csv = exportLoadsCsv([
      makeLoad({ customer_reference: 'PO "123", extra', notes: "line one\nline two" }),
    ])
    expect(csv).toContain('"PO ""123"", extra"')
    expect(csv).toContain('"line one\nline two"')
  })

  it("leaves plain fields unquoted", () => {
    const csv = exportLoadsCsv([makeLoad({ customer_reference: "PO123" })])
    expect(csv.split("\n")[1]).toContain(",PO123,")
  })
})
