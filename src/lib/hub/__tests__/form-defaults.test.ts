import { describe, expect, it } from "vitest"
import {
  emptyCustomer,
  emptyDriver,
  emptyLoadForm,
  emptyTrailer,
  emptyTruck,
} from "../form-defaults"

describe("emptyLoadForm", () => {
  it("returns a pickup + delivery stop pair and no accessorials", () => {
    const form = emptyLoadForm()
    expect(form.stops).toHaveLength(2)
    expect(form.stops[0].type).toBe("pickup")
    expect(form.stops[1].type).toBe("delivery")
    expect(form.accessorials).toEqual([])
    expect(form.equipment).toBe("dry_van")
    expect(form.factored).toBe(false)
  })

  it("returns independent stop/accessorial arrays on each call", () => {
    const a = emptyLoadForm()
    const b = emptyLoadForm()
    expect(a).not.toBe(b)
    expect(a.stops).not.toBe(b.stops)
    expect(a.stops[0]).not.toBe(b.stops[0])
    expect(a.accessorials).not.toBe(b.accessorials)

    a.stops[0].facility = "Warehouse 12"
    a.accessorials.push({} as never)
    expect(b.stops[0].facility).toBe("")
    expect(b.accessorials).toHaveLength(0)
  })

  it("blanks every string field and defaults fcfs/notes on stops", () => {
    const form = emptyLoadForm()
    for (const stop of form.stops) {
      expect(stop.fcfs).toBe(false)
      expect(stop.notes).toBe("")
      expect(stop.appt_start).toBe("")
    }
  })
})

describe("emptyTruck", () => {
  it("defaults ownership to company and status to active", () => {
    const truck = emptyTruck()
    expect(truck.ownership).toBe("company")
    expect(truck.status).toBe("active")
    expect(truck.unit_number).toBe("")
    expect(truck.assigned_driver_id).toBe("")
  })

  it("returns a fresh object each call", () => {
    const a = emptyTruck()
    const b = emptyTruck()
    expect(a).not.toBe(b)
    a.unit_number = "101"
    expect(b.unit_number).toBe("")
  })
})

describe("emptyTrailer", () => {
  it("defaults type to dry_van and status to active", () => {
    const trailer = emptyTrailer()
    expect(trailer.type).toBe("dry_van")
    expect(trailer.status).toBe("active")
    expect(trailer.vin).toBe("")
  })

  it("returns a fresh object each call", () => {
    const a = emptyTrailer()
    const b = emptyTrailer()
    expect(a).not.toBe(b)
    a.unit_number = "T-9"
    expect(b.unit_number).toBe("")
  })
})

describe("emptyDriver", () => {
  it("defaults pay_type to per_mile and pay_loaded_miles_only to true", () => {
    const driver = emptyDriver()
    expect(driver.pay_type).toBe("per_mile")
    expect(driver.pay_loaded_miles_only).toBe(true)
    expect(driver.status).toBe("active")
    expect(driver.first_name).toBe("")
  })

  it("returns a fresh object each call", () => {
    const a = emptyDriver()
    const b = emptyDriver()
    expect(a).not.toBe(b)
    a.first_name = "Jas"
    expect(b.first_name).toBe("")
  })
})

describe("emptyCustomer", () => {
  it("defaults type to broker, status to active, and payment_terms_days to 30", () => {
    const customer = emptyCustomer()
    expect(customer.type).toBe("broker")
    expect(customer.status).toBe("active")
    expect(customer.payment_terms_days).toBe("30")
    expect(customer.factored).toBe(false)
  })

  it("returns a fresh object each call", () => {
    const a = emptyCustomer()
    const b = emptyCustomer()
    expect(a).not.toBe(b)
    a.name = "Acme Foods"
    expect(b.name).toBe("")
  })
})
