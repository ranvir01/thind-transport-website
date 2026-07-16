/**
 * M11 onboarding imports: the universal importer's trucks / drivers / customers
 * kinds. Pins carrier scoping, idempotent duplicate skipping by natural key,
 * pay defaults sourced from workspace settings, and the audit trail — plus the
 * welcome checklist deep-linking each setup entity to the importer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({ createLoad: vi.fn() }))
vi.mock("@/lib/hub/customers", () => ({
  findCustomerByName: vi.fn(async () => null),
  createCustomer: vi.fn(async () => ({ id: "c-new" })),
}))
vi.mock("@/lib/hub/fleet", () => ({ createTruck: vi.fn(async () => ({ id: "t-new" })) }))
vi.mock("@/lib/hub/drivers", () => ({ createDriver: vi.fn(async () => ({ id: "d-new" })) }))
vi.mock("@/lib/hub/settings", () => ({
  getCarrierSettings: vi.fn(async () => ({
    pay: { companyDriverPerMile: 0.62, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: false },
  })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/vin", () => ({ decodeVin: vi.fn(async () => null) }))

import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { decodeVin } from "@/lib/hub/vin"
import { createTruck } from "@/lib/hub/fleet"
import { createDriver } from "@/lib/hub/drivers"
import { createCustomer, findCustomerByName } from "@/lib/hub/customers"
import {
  importCustomersAction, importDriversAction, importTrucksAction,
} from "@/app/hub/_actions/import"
import { SETUP_CHECKLIST } from "@/lib/hub/setup-guide"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)
const decodeVinMock = vi.mocked(decodeVin)
const createTruckMock = vi.mocked(createTruck)
const createDriverMock = vi.mocked(createDriver)
const createCustomerMock = vi.mocked(createCustomer)
const findCustomerByNameMock = vi.mocked(findCustomerByName)

beforeEach(() => {
  vi.clearAllMocks()
  queryMock.mockResolvedValue([])
  findCustomerByNameMock.mockResolvedValue(null)
  decodeVinMock.mockResolvedValue(null)
})

describe("importTrucksAction", () => {
  it("creates carrier-scoped trucks and skips unit numbers already on file", async () => {
    queryMock.mockResolvedValueOnce([{ id: "t1", unit_number: "101" }])
    const result = await importTrucksAction([
      { unit_number: "101", make: "Peterbilt" },
      { unit_number: "202", year: "2019", ownership: "Owner Operator", plate_state: "wa" },
    ])
    expect(result.ok).toBe(true)
    expect(result.imported).toBe(1)
    expect(result.skippedDuplicates).toBe(1)
    expect(createTruckMock).toHaveBeenCalledTimes(1)
    expect(createTruckMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({
        unit_number: "202", year: 2019, ownership: "owner_operator",
        plate_state: "WA", status: "active",
      })
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_trucks", entityType: "import", carrierId: "carrier-1" })
    )
  })

  it("fails the row (not the batch) when the unit number is missing", async () => {
    const result = await importTrucksAction([{ make: "Kenworth" }, { unit_number: "303" }])
    expect(result.imported).toBe(1)
    expect(result.failed).toEqual([{ row: 1, error: "Missing unit #" }])
    expect(result.ok).toBe(false)
  })

  it("decodes the VIN to fill missing year/make/model, spreadsheet values winning", async () => {
    decodeVinMock.mockResolvedValue({ year: 2019, make: "FREIGHTLINER", model: "CASCADIA" })
    const result = await importTrucksAction([
      { unit_number: "101", vin: "1fujgldr8clbp1234", make: "Freightliner" },
    ])
    expect(decodeVinMock).toHaveBeenCalledWith("1FUJGLDR8CLBP1234")
    expect(createTruckMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({
        vin: "1FUJGLDR8CLBP1234", year: 2019, make: "Freightliner", model: "CASCADIA",
      })
    )
    expect(result.vinDecoded).toBe(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: expect.objectContaining({ vinDecoded: 1 }) })
    )
  })

  it("skips the vPIC lookup when year, make, and model are all on the row", async () => {
    await importTrucksAction([
      { unit_number: "101", vin: "1FUJGLDR8CLBP1234", year: "2019", make: "Peterbilt", model: "579" },
    ])
    expect(decodeVinMock).not.toHaveBeenCalled()
  })

  it("caches decode results per batch and imports the row as-is on a null decode", async () => {
    const result = await importTrucksAction([
      { unit_number: "101", vin: "1FUJGLDR8CLBP1234" },
      { unit_number: "202", vin: "1FUJGLDR8CLBP1234" },
    ])
    expect(decodeVinMock).toHaveBeenCalledTimes(1)
    expect(result.imported).toBe(2)
    expect(result.vinDecoded).toBe(0)
    expect(createTruckMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ unit_number: "101", year: null, make: null, model: null })
    )
  })
})

describe("importDriversAction", () => {
  it("seeds pay from workspace settings and skips names already on file", async () => {
    queryMock.mockResolvedValueOnce([{ id: "d1", name: "raj thind" }])
    const result = await importDriversAction([
      { first_name: "Raj", last_name: "Thind" },
      { first_name: "Amar", last_name: "Gill", cdl_state: "wa" },
    ])
    expect(result.imported).toBe(1)
    expect(result.skippedDuplicates).toBe(1)
    expect(createDriverMock).toHaveBeenCalledTimes(1)
    expect(createDriverMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({
        first_name: "Amar", last_name: "Gill", cdl_state: "WA",
        pay_type: "per_mile", pay_rate: 0.62, pay_loaded_miles_only: false,
        status: "active",
      })
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_drivers", entityType: "import" })
    )
  })

  it("requires both first and last name per row", async () => {
    const result = await importDriversAction([{ first_name: "OnlyFirst" }])
    expect(result.imported).toBe(0)
    expect(result.failed).toHaveLength(1)
  })
})

describe("importCustomersAction", () => {
  it("skips existing customers and in-batch duplicates, defaults type/terms", async () => {
    findCustomerByNameMock.mockImplementation(async (_carrierId, name) =>
      name === "TQL" ? ({ id: "c1" } as never) : null
    )
    const result = await importCustomersAction([
      { name: "TQL" },
      { name: "Coyote Logistics" },
      { name: "coyote logistics" },
      { name: "Acme Foods", customer_type: "Shipper", payment_terms_days: "45" },
    ])
    expect(result.imported).toBe(2)
    expect(result.skippedDuplicates).toBe(2)
    expect(createCustomerMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ name: "Coyote Logistics", type: "broker", payment_terms_days: 30 })
    )
    expect(createCustomerMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({ name: "Acme Foods", type: "shipper", payment_terms_days: 45 })
    )
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "import_customers", entityType: "import" })
    )
  })
})

describe("welcome checklist deep links", () => {
  it("sends each setup entity to the universal importer with its kind", () => {
    const byKey = Object.fromEntries(SETUP_CHECKLIST.map((s) => [s.key, s.href]))
    expect(byKey.trucks).toBe("/hub/import?kind=trucks")
    expect(byKey.drivers).toBe("/hub/import?kind=drivers")
    expect(byKey.customers).toBe("/hub/import?kind=customers")
    expect(byKey.loads).toBe("/hub/import")
  })
})
