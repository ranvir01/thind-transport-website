import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import { addComplianceItem, complianceEntries, resolveComplianceItem, summarize } from "../compliance"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

function mockRowsBySql(rows: {
  drivers?: unknown[]
  trucks?: unknown[]
  trailers?: unknown[]
  maintenance?: unknown[]
  odometers?: { truck_id: string; odometer: string }[]
  manual?: unknown[]
  iftaReports?: { quarter: string; status: string }[]
}) {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.drivers")) return rows.drivers ?? []
    if (s.includes("FROM hub.maintenance_schedules")) return rows.maintenance ?? []
    // The odometer union query never mentions hub.trucks/hub.drivers, only
    // position_pings/maintenance_records/dvirs — check it before the plain
    // hub.trucks branch below.
    if (s.includes("hub.position_pings") && s.includes("hub.dvirs")) return rows.odometers ?? []
    if (s.includes("FROM hub.trucks")) return rows.trucks ?? []
    if (s.includes("FROM hub.trailers")) return rows.trailers ?? []
    if (s.includes("FROM hub.compliance_items")) return rows.manual ?? []
    if (s.includes("FROM hub.ifta_reports")) return rows.iftaReports ?? []
    return []
  })
}

describe("complianceEntries color thresholds (colorFor)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("colors a past due date red, a date inside 30 days amber, and a far-out date green", async () => {
    const now = Date.now()
    const past = new Date(now - 86400000).toISOString().slice(0, 10)
    const soon = new Date(now + 10 * 86400000).toISOString().slice(0, 10)
    const far = new Date(now + 90 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      drivers: [
        { id: "d1", name: "Red Driver", cdl_expiry: past, medical_card_expiry: far },
        { id: "d2", name: "Amber Driver", cdl_expiry: soon, medical_card_expiry: far },
      ],
    })
    const entries = await complianceEntries(CARRIER)
    const cdlRed = entries.find((e) => e.entityId === "d1" && e.kind === "CDL")
    const cdlAmber = entries.find((e) => e.entityId === "d2" && e.kind === "CDL")
    const medGreen = entries.find((e) => e.entityId === "d1" && e.kind === "Medical card")
    expect(cdlRed?.color).toBe("red")
    expect(cdlAmber?.color).toBe("amber")
    expect(medGreen?.color).toBe("green")
  })

  it("treats a missing driver/truck due date as amber (needs attention)", async () => {
    mockRowsBySql({
      drivers: [{ id: "d1", name: "No Card", cdl_expiry: null, medical_card_expiry: null }],
    })
    // complianceEntries also appends a calendar-synthesized "IFTA filing <Q>"
    // company entry whose color tracks the wall clock (red once the last
    // completed quarter's deadline passes). That entry is unrelated to this
    // test's concern — missing driver/truck due dates — so scope the assertion
    // to the driver entries; otherwise the test flips red every post-deadline
    // window and blocks every push in that window.
    const entries = await complianceEntries(CARRIER)
    const driverEntries = entries.filter((e) => e.entity === "driver")
    expect(driverEntries.length).toBeGreaterThan(0)
    expect(driverEntries.every((e) => e.color === "amber")).toBe(true)
  })

  it("treats a manual company item with no due date as amber (needs a date)", async () => {
    mockRowsBySql({
      manual: [{ id: "item-1", kind: "IFTA decals", due_on: null, note: null }],
    })
    const entries = await complianceEntries(CARRIER)
    const manual = entries.find((e) => e.manualItemId === "item-1")
    expect(manual).toBeDefined()
    expect(manual!.color).toBe("amber")
  })

  it("sorts red before amber before green, ties broken by earliest due date", async () => {
    const now = Date.now()
    const past2 = new Date(now - 2 * 86400000).toISOString().slice(0, 10)
    const past1 = new Date(now - 1 * 86400000).toISOString().slice(0, 10)
    const far = new Date(now + 90 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      drivers: [
        { id: "d1", name: "Driver A", cdl_expiry: far, medical_card_expiry: null },
        { id: "d2", name: "Driver B", cdl_expiry: past1, medical_card_expiry: null },
      ],
      manual: [{ id: "item-1", kind: "2290", due_on: past2, note: null }],
    })
    // Exclude the calendar-synthesized "IFTA filing <Q>" company entry: its
    // color and due date follow the wall clock, so once the last completed
    // quarter's deadline passes it becomes a red entry that sorts ahead of the
    // seeded 2290 item (breaking the tie-break assertion) purely because of the
    // date the suite runs. This test is about ranking the fixtures it created.
    const entries = (await complianceEntries(CARRIER)).filter(
      (e) => !e.kind.startsWith("IFTA filing")
    )
    const redEntries = entries.filter((e) => e.color === "red")
    expect(redEntries[0].kind).toBe("2290")
    expect(redEntries[1].kind).toBe("CDL")
    expect(entries[entries.length - 1].color).not.toBe("red")
  })
})

describe("complianceEntries trailers", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("surfaces trailer registration and inspection expiries, same as trucks", async () => {
    mockRowsBySql({
      trailers: [
        { id: "trailer-1", unit_number: "501", registration_expiry: "2020-01-01", inspection_due: "2020-06-01" },
      ],
    })
    const entries = await complianceEntries(CARRIER)
    const trailerEntries = entries.filter((e) => e.entity === "trailer")

    expect(trailerEntries).toHaveLength(2)
    expect(trailerEntries.map((e) => e.kind).sort()).toEqual(["Annual inspection (396.17)", "Registration"])
    expect(trailerEntries.every((e) => e.name === "Trailer #501")).toBe(true)
    expect(trailerEntries.every((e) => e.href === "/hub/fleet/trailers/trailer-1")).toBe(true)
    expect(trailerEntries.every((e) => e.color === "red")).toBe(true)
  })

  it("scopes the trailer query by carrier, excludes retired and soft-deleted rows", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const trailerCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("hub.trailers"))
    expect(trailerCall).toBeDefined()
    const [sql, params] = trailerCall!
    expect(sql).toContain("carrier_id = $1")
    expect(sql).toContain("deleted_at IS NULL")
    expect(sql).toContain("status <> 'retired'")
    expect(params).toEqual([CARRIER])
  })

  it("returns no trailer entries when the fleet has none", async () => {
    mockRowsBySql({})
    const entries = await complianceEntries(CARRIER)
    expect(entries.filter((e) => e.entity === "trailer")).toHaveLength(0)
  })
})

describe("complianceEntries mileage-based maintenance", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("flags a mileage-only PM schedule red once the truck has passed the interval (previously stuck amber forever)", async () => {
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "Tire rotation", due_on: null, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [{ truck_id: "t1", odometer: "130160" }],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: Tire rotation")
    expect(pm?.color).toBe("red")
    expect(pm?.due).toBeNull()
    expect(pm?.dueMiles).toBe(-10160)
  })

  it("flags a mileage-only PM schedule amber inside the amber window", async () => {
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "Tire rotation", due_on: null, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [{ truck_id: "t1", odometer: "119800" }],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: Tire rotation")
    expect(pm?.color).toBe("amber")
    expect(pm?.dueMiles).toBe(200)
  })

  it("flags a mileage-only PM schedule green with plenty of margin", async () => {
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "Tire rotation", due_on: null, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [{ truck_id: "t1", odometer: "105000" }],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: Tire rotation")
    expect(pm?.color).toBe("green")
    expect(pm?.dueMiles).toBe(15000)
  })

  it("takes whichever of date or mileage is more urgent (mileage overdue, date far out)", async () => {
    const far = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "PM service", due_on: far, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [{ truck_id: "t1", odometer: "130160" }],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: PM service")
    expect(pm?.color).toBe("red")
    expect(pm?.due).toBeNull()
    expect(pm?.dueMiles).toBe(-10160)
  })

  it("takes whichever of date or mileage is more urgent (date due soon, mileage far out)", async () => {
    const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "PM service", due_on: soon, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [{ truck_id: "t1", odometer: "105000" }],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: PM service")
    expect(pm?.color).toBe("amber")
    expect(pm?.due).toBe(soon)
    expect(pm?.dueMiles).toBeNull()
  })

  it("falls back to amber (needs data) when neither a date nor an odometer reading is available", async () => {
    mockRowsBySql({
      maintenance: [
        { id: "s1", truck_id: "t1", unit_number: "102", name: "New PM", due_on: null, interval_miles: 20000, last_done_odometer: "100000" },
      ],
      odometers: [],
    })
    const entries = await complianceEntries(CARRIER)
    const pm = entries.find((e) => e.kind === "PM: New PM")
    expect(pm?.color).toBe("amber")
    expect(pm?.due).toBeNull()
    expect(pm?.dueMiles).toBeNull()
  })

  it("does not query for odometers at all when the carrier has no maintenance schedules", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const odometerCall = queryMock.mock.calls.find(
      ([sql]) => String(sql).includes("hub.position_pings") && String(sql).includes("hub.dvirs")
    )
    expect(odometerCall).toBeUndefined()
  })
})

describe("complianceEntries carrier scoping", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("scopes every underlying query to the given carrier_id", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    for (const [sql, params] of queryMock.mock.calls) {
      // The carrier is always the first bind. Some queries take further
      // params of their own (the Form 2290 wall passes the tax-period start),
      // so the pin is on the scope, not on the argument count.
      expect(String(sql)).toContain("carrier_id = $1")
      expect((params as unknown[])[0]).toBe(CARRIER)
    }
    expect(queryMock).toHaveBeenCalledTimes(8)
    const iftaCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.ifta_reports"))
    expect(iftaCall).toBeDefined()
    expect(iftaCall![1]).toEqual([CARRIER])
  })

  it("excludes soft-deleted drivers/trucks and inactive/retired records", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const driverSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.drivers"))![0])
    const truckSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.trucks"))![0])
    expect(driverSql).toContain("deleted_at IS NULL AND status = 'active'")
    expect(truckSql).toContain("deleted_at IS NULL AND status <> 'retired'")
  })

  it("only pulls open, company-level manual items", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const manualSql = String(queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.compliance_items"))![0])
    expect(manualSql).toContain("status = 'open'")
    expect(manualSql).toContain("entity_type = 'company'")
  })
})

describe("complianceEntries IFTA filing", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("includes auto-tracked IFTA quarterly filing entries from ifta reports", async () => {
    mockRowsBySql({
      iftaReports: [{ quarter: "2026Q2", status: "draft" }],
    })
    const entries = await complianceEntries(CARRIER)
    const ifta = entries.filter((e) => e.kind.startsWith("IFTA filing"))
    expect(ifta.length).toBeGreaterThan(0)
    expect(ifta.some((e) => e.entity === "company" && e.href.includes("/hub/compliance/ifta"))).toBe(true)
  })

  it("scopes the IFTA reports query by carrier_id", async () => {
    mockRowsBySql({})
    await complianceEntries(CARRIER)
    const iftaCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.ifta_reports"))
    expect(iftaCall).toBeDefined()
    expect(String(iftaCall![0])).toContain("carrier_id = $1")
    expect(iftaCall![1]).toEqual([CARRIER])
  })
})

describe("addComplianceItem / resolveComplianceItem", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryOneMock.mockReset()
  })

  it("inserts a company-level item scoped to the carrier", async () => {
    queryMock.mockResolvedValue([])
    await addComplianceItem(CARRIER, { kind: "UCR", dueOn: "2026-12-31", note: "annual" })
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.compliance_items")
    expect(String(sql)).toContain("'company'")
    expect(params).toEqual([CARRIER, "UCR", "2026-12-31", "annual"])
  })

  it("resolveComplianceItem scopes the update by carrier_id AND id (both-sides tenancy)", async () => {
    queryMock.mockResolvedValue([])
    await resolveComplianceItem(CARRIER, "item-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("carrier_id = $1 AND id = $2")
    expect(params).toEqual([CARRIER, "item-1"])
  })
})

describe("summarize", () => {
  it("counts entries per color bucket", () => {
    const entries = [
      { color: "red" }, { color: "red" }, { color: "amber" }, { color: "green" }, { color: "green" }, { color: "green" },
    ] as Parameters<typeof summarize>[0]
    expect(summarize(entries)).toEqual({ red: 2, amber: 1, green: 3 })
  })

  it("returns all zeros for no entries", () => {
    expect(summarize([])).toEqual({ red: 0, amber: 0, green: 0 })
  })
})
