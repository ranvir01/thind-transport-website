import { describe, expect, it } from "vitest"
import {
  contactSchema,
  customerSchema,
  documentUploadSchema,
  driverSchema,
  hubUserSchema,
  loadSchema,
  stopSchema,
  trailerSchema,
  truckSchema,
} from "../schemas"

const VALID_UUID = "11111111-1111-4111-8111-111111111111"

const validStop = (type: "pickup" | "delivery") => ({
  type,
  city: "Kent",
  state: "WA",
})

describe("truckSchema", () => {
  it("accepts a minimal valid truck", () => {
    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
    })
    expect(parsed.unit_number).toBe("101")
    // optional fields not supplied resolve to undefined, not null
    expect(parsed.vin).toBeUndefined()
  })

  it("rejects a blank unit_number", () => {
    expect(() =>
      truckSchema.parse({ unit_number: "   ", ownership: "company", status: "active" })
    ).toThrow()
  })

  it("rejects an unknown ownership/status enum value", () => {
    expect(() =>
      truckSchema.parse({ unit_number: "101", ownership: "leased", status: "active" })
    ).toThrow()
    expect(() =>
      truckSchema.parse({ unit_number: "101", ownership: "company", status: "wrecked" })
    ).toThrow()
  })

  it("turns an empty-string optional field into null", () => {
    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
      vin: "",
      notes: "  ",
    })
    expect(parsed.vin).toBeNull()
    expect(parsed.notes).toBeNull()
  })

  it("coerces tank_capacity_gallons from a numeric string and rejects negatives", () => {
    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
      tank_capacity_gallons: "150",
    })
    expect(parsed.tank_capacity_gallons).toBe(150)

    expect(() =>
      truckSchema.parse({
        unit_number: "101",
        ownership: "company",
        status: "active",
        tank_capacity_gallons: "-5",
      })
    ).toThrow()
  })

  it("coerces an empty-string year/tank_capacity to 0, not null (Number('') is 0, so the .or('') -> null fallback never runs)", () => {
    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
      year: "",
      tank_capacity_gallons: "",
    })
    expect(parsed.year).toBe(0)
    expect(parsed.tank_capacity_gallons).toBe(0)
  })

  it("requires registration_expiry/inspection_due/insurance_expiry to be YYYY-MM-DD when present", () => {
    expect(() =>
      truckSchema.parse({
        unit_number: "101",
        ownership: "company",
        status: "active",
        registration_expiry: "07/15/2026",
      })
    ).toThrow()

    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
      registration_expiry: "2026-07-15",
    })
    expect(parsed.registration_expiry).toBe("2026-07-15")
  })

  it("does not validate calendar-impossible dates beyond the regex shape", () => {
    // schemas.ts only checks the YYYY-MM-DD shape; callers relying on Date
    // parsing downstream must still guard against silent rollover.
    const parsed = truckSchema.parse({
      unit_number: "101",
      ownership: "company",
      status: "active",
      inspection_due: "2026-02-31",
    })
    expect(parsed.inspection_due).toBe("2026-02-31")
  })
})

describe("trailerSchema", () => {
  it("requires type to be a known equipment type", () => {
    expect(() =>
      trailerSchema.parse({
        unit_number: "T1",
        type: "container",
        status: "active",
      })
    ).toThrow()

    const parsed = trailerSchema.parse({
      unit_number: "T1",
      type: "reefer",
      status: "active",
    })
    expect(parsed.type).toBe("reefer")
  })
})

describe("driverSchema", () => {
  const base = {
    first_name: "Jasbir",
    last_name: "Singh",
    pay_type: "per_mile" as const,
    pay_rate: "0.55",
    status: "active" as const,
  }

  it("accepts a minimal valid driver and applies defaults", () => {
    const parsed = driverSchema.parse(base)
    expect(parsed.pay_rate).toBe(0.55)
    expect(parsed.pay_loaded_miles_only).toBe(true)
    expect(parsed.escrow_weekly).toBe(0)
    expect(parsed.insurance_weekly).toBe(0)
  })

  it("rejects a negative pay_rate", () => {
    expect(() => driverSchema.parse({ ...base, pay_rate: "-1" })).toThrow()
  })

  it("rejects blank first_name/last_name", () => {
    expect(() => driverSchema.parse({ ...base, first_name: "" })).toThrow()
    expect(() => driverSchema.parse({ ...base, last_name: "   " })).toThrow()
  })

  it("coerces pay_loaded_miles_only from a form checkbox string", () => {
    expect(driverSchema.parse({ ...base, pay_loaded_miles_only: "false" }).pay_loaded_miles_only).toBe(
      true
    )
    expect(driverSchema.parse({ ...base, pay_loaded_miles_only: "" }).pay_loaded_miles_only).toBe(
      false
    )
  })
})

describe("customerSchema", () => {
  const base = {
    name: "Acme Freight",
    type: "broker" as const,
    status: "active" as const,
  }

  it("defaults payment_terms_days to 30 and clamps to [0, 365]", () => {
    expect(customerSchema.parse(base).payment_terms_days).toBe(30)
    expect(() => customerSchema.parse({ ...base, payment_terms_days: -1 })).toThrow()
    expect(() => customerSchema.parse({ ...base, payment_terms_days: 366 })).toThrow()
    expect(customerSchema.parse({ ...base, payment_terms_days: 365 }).payment_terms_days).toBe(365)
  })

  it("coerces an empty-string credit_limit to 0, not null (same z.coerce.number() short-circuit as optionalInt)", () => {
    expect(customerSchema.parse({ ...base, credit_limit: "" }).credit_limit).toBe(0)
  })

  it("rejects a negative credit_limit", () => {
    expect(() => customerSchema.parse({ ...base, credit_limit: "-100" })).toThrow()
  })

  it("coerces factored from a checkbox string", () => {
    expect(customerSchema.parse({ ...base, factored: "on" }).factored).toBe(true)
  })
})

describe("contactSchema", () => {
  it("requires customer_id to be a UUID", () => {
    expect(() => contactSchema.parse({ customer_id: "not-a-uuid", name: "Dana" })).toThrow()
    expect(contactSchema.parse({ customer_id: VALID_UUID, name: "Dana" }).customer_id).toBe(
      VALID_UUID
    )
  })
})

describe("stopSchema", () => {
  it("requires a 2-letter state code", () => {
    expect(() => stopSchema.parse({ type: "pickup", city: "Kent", state: "W" })).toThrow()
    expect(() => stopSchema.parse({ type: "pickup", city: "Kent", state: "WAS" })).toThrow()
    expect(stopSchema.parse({ type: "pickup", city: "Kent", state: "WA" }).state).toBe("WA")
  })

  it("defaults fcfs to false", () => {
    expect(stopSchema.parse({ type: "delivery", city: "Kent", state: "WA" }).fcfs).toBe(false)
  })
})

describe("loadSchema", () => {
  const base = {
    customer_id: VALID_UUID,
    equipment: "dry_van" as const,
    linehaul: "1200",
    stops: [validStop("pickup"), validStop("delivery")],
  }

  it("accepts a minimal valid load and defaults accessorials/fuel_surcharge", () => {
    const parsed = loadSchema.parse(base)
    expect(parsed.accessorials).toEqual([])
    expect(parsed.fuel_surcharge).toBe(0)
    expect(parsed.linehaul).toBe(1200)
  })

  it("requires customer_id to be a UUID", () => {
    expect(() => loadSchema.parse({ ...base, customer_id: "nope" })).toThrow()
  })

  it("rejects fewer than 2 stops", () => {
    expect(() => loadSchema.parse({ ...base, stops: [validStop("pickup")] })).toThrow()
  })

  it("rejects a negative linehaul", () => {
    expect(() => loadSchema.parse({ ...base, linehaul: "-1" })).toThrow()
  })

  it("validates nested stop shape, e.g. a bad state code inside stops", () => {
    expect(() =>
      loadSchema.parse({ ...base, stops: [{ ...validStop("pickup"), state: "WASH" }, validStop("delivery")] })
    ).toThrow()
  })

  it("requires each accessorial to have a non-empty label", () => {
    expect(() =>
      loadSchema.parse({ ...base, accessorials: [{ label: "", amount: "50" }] })
    ).toThrow()

    const parsed = loadSchema.parse({
      ...base,
      accessorials: [{ label: "Lumper", amount: "50" }],
    })
    expect(parsed.accessorials).toEqual([{ label: "Lumper", amount: 50 }])
  })
})

describe("documentUploadSchema", () => {
  it("requires entity_id to be a UUID and entity_type/kind to be known values", () => {
    expect(() =>
      documentUploadSchema.parse({ entity_type: "load", entity_id: "nope", kind: "insurance" })
    ).toThrow()

    expect(() =>
      documentUploadSchema.parse({ entity_type: "spaceship", entity_id: VALID_UUID, kind: "insurance" })
    ).toThrow()

    expect(() =>
      documentUploadSchema.parse({ entity_type: "load", entity_id: VALID_UUID, kind: "coi" })
    ).toThrow()

    const parsed = documentUploadSchema.parse({
      entity_type: "load",
      entity_id: VALID_UUID,
      kind: "insurance",
    })
    expect(parsed.kind).toBe("insurance")
  })
})

describe("hubUserSchema", () => {
  it("requires a valid email and an 8+ char password", () => {
    expect(() =>
      hubUserSchema.parse({ email: "not-an-email", name: "Dana", role: "owner", password: "longenough" })
    ).toThrow()

    expect(() =>
      hubUserSchema.parse({ email: "dana@example.com", name: "Dana", role: "owner", password: "short" })
    ).toThrow()

    const parsed = hubUserSchema.parse({
      email: "  Dana@Example.com ",
      name: "Dana",
      role: "owner",
      password: "longenough",
    })
    expect(parsed.email).toBe("Dana@Example.com")
  })
})
