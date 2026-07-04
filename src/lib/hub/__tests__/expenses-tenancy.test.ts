import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "../db"
import { logAudit } from "../audit"
import { createExpense, exportCsv, listExpenses } from "../expenses"
import { createAdvance } from "../settlements"

const queryMock = vi.mocked(query)
const auditMock = vi.mocked(logAudit)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const FOREIGN = "22222222-2222-2222-2222-222222222222"
const OWNED = "33333333-3333-3333-3333-333333333333"
const ACTOR = { id: "44444444-4444-4444-4444-444444444444", name: "Test Actor" }

const expenseInput = {
  category: "tolls" as const,
  amountCents: 1250,
  incurredOn: "2026-07-04",
  reimbursable: false,
  billable: false,
}

describe("createExpense cross-table tenancy (AGENTS.md both-sides rule)", () => {
  beforeEach(() => {
    queryMock.mockReset()
    auditMock.mockClear()
  })

  it.each([
    ["truckId", { truckId: FOREIGN }, "Truck not found"],
    ["driverId", { driverId: FOREIGN }, "Driver not found"],
    ["loadId", { loadId: FOREIGN }, "Load not found"],
  ])("rejects a foreign %s before inserting", async (_field, refs, message) => {
    queryMock.mockResolvedValue([]) // ref lookup finds nothing under this carrier
    await expect(createExpense(CARRIER, { ...expenseInput, ...refs }, ACTOR)).rejects.toThrow(message)
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.expenses"))
    expect(inserts).toHaveLength(0)
    expect(auditMock).not.toHaveBeenCalled()
  })

  it("inserts and audits when refs belong to the carrier", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      String(sql).includes("INSERT INTO hub.expenses") ? [{ id: OWNED }] : [{ id: OWNED }]
    )
    await createExpense(CARRIER, { ...expenseInput, truckId: OWNED, loadId: OWNED }, ACTOR)
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.expenses"))
    expect(inserts).toHaveLength(1)
    expect(auditMock).toHaveBeenCalledTimes(1)
  })

  it("skips ref checks entirely when no refs are provided", async () => {
    queryMock.mockResolvedValue([{ id: OWNED }])
    await createExpense(CARRIER, expenseInput, ACTOR)
    const selects = queryMock.mock.calls.filter(([sql]) => String(sql).trim().startsWith("SELECT"))
    expect(selects).toHaveLength(0)
  })
})

describe("expense reads carrier-guard their truck/driver joins", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
  })

  it("listExpenses joins trucks and drivers on the expense's carrier", async () => {
    await listExpenses(CARRIER)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON t.id = e.truck_id AND t.carrier_id = e.carrier_id")
    expect(sql).toContain("ON d.id = e.driver_id AND d.carrier_id = e.carrier_id")
  })

  it("expenses CSV export joins trucks and drivers on the expense's carrier", async () => {
    await exportCsv(CARRIER, "expenses")
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON t.id = e.truck_id AND t.carrier_id = e.carrier_id")
    expect(sql).toContain("ON d.id = e.driver_id AND d.carrier_id = e.carrier_id")
  })
})

describe("createAdvance cross-table tenancy", () => {
  beforeEach(() => {
    queryMock.mockReset()
    auditMock.mockClear()
  })

  it("rejects a foreign driverId before inserting", async () => {
    queryMock.mockResolvedValue([])
    await expect(
      createAdvance(CARRIER, { driverId: FOREIGN, amountCents: 5000, issuedOn: "2026-07-04" }, ACTOR)
    ).rejects.toThrow("Driver not found")
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.advances"))
    expect(inserts).toHaveLength(0)
    expect(auditMock).not.toHaveBeenCalled()
  })

  it("inserts and audits when the driver belongs to the carrier", async () => {
    queryMock.mockResolvedValue([{ id: OWNED }])
    await createAdvance(CARRIER, { driverId: OWNED, amountCents: 5000, issuedOn: "2026-07-04" }, ACTOR)
    const inserts = queryMock.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO hub.advances"))
    expect(inserts).toHaveLength(1)
    expect(auditMock).toHaveBeenCalledTimes(1)
  })
})
