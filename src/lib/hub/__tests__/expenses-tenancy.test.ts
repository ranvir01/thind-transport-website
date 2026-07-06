import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "../db"
import { logAudit } from "../audit"
import { createExpense, exportCsv, exportQboArIif, exportQboIif, listExpenses } from "../expenses"
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

  it("settlements CSV export joins drivers on the settlement's carrier", async () => {
    await exportCsv(CARRIER, "settlements")
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON d.id = s.driver_id AND d.carrier_id = s.carrier_id")
  })

  it("1099 CSV export joins drivers on the settlement's carrier", async () => {
    await exportCsv(CARRIER, "1099")
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON d.id = s.driver_id AND d.carrier_id = s.carrier_id")
  })
})

describe("exportCsv date columns (QuickBooks-importable ISO)", () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it.each([
    ["invoices", "invoices", new Date("2026-07-04T00:00:00.000Z"), "InvoiceDate"],
    ["payments", "payments", new Date("2026-06-15T00:00:00.000Z"), "PaymentDate"],
    ["expenses", "expenses", new Date("2026-05-20T00:00:00.000Z"), "Date"],
  ])("%s export renders %s as YYYY-MM-DD, not Date.toString", async (_label, kind, pgDate, header) => {
    queryMock.mockResolvedValue([
      kind === "invoices"
        ? { number: "INV-1", customer: "Acme", load: "LD-1", issued_on: pgDate, due_on: pgDate, amount: 100, status: "open", factored: false }
        : kind === "payments"
          ? { number: "INV-1", paid_on: pgDate, amount: 50, method: "ach", reference: "ref" }
          : { incurred_on: pgDate, category: "tolls", amount: 12.5, truck: "101", driver: "Test Driver", memo: "memo" },
    ])
    const { csv } = await exportCsv(CARRIER, kind)
    const lines = csv.trim().split("\n")
    expect(lines[0]).toContain(header)
    expect(lines[1]).toMatch(/2026-\d{2}-\d{2}/)
    expect(lines[1]).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
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

describe("exportQboIif (QuickBooks Desktop general journal)", () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it("joins trucks and drivers on the expense's carrier", async () => {
    queryMock.mockResolvedValue([])
    await exportQboIif(CARRIER)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("ON t.id = e.truck_id AND t.carrier_id = e.carrier_id")
    expect(sql).toContain("ON d.id = e.driver_id AND d.carrier_id = e.carrier_id")
  })

  it("emits a balanced TRNS/SPL/ENDTRNS block per expense with the category's mapped account", async () => {
    queryMock.mockResolvedValue([
      {
        incurred_on: new Date("2026-07-04T00:00:00.000Z"),
        category: "maintenance",
        amount_cents: 42599,
        truck: "101",
        driver: "Test Driver",
        memo: "Brake job",
      },
    ])
    const { filename, iif } = await exportQboIif(CARRIER)
    expect(filename).toBe("expenses-qbo.iif")
    const lines = iif.trim().split("\r\n")
    expect(lines[0]).toBe("!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO")
    const trns = lines.find((l) => l.startsWith("TRNS\t"))
    const spl = lines.find((l) => l.startsWith("SPL\t"))
    expect(lines).toContain("ENDTRNS")
    expect(trns).toContain("07/04/2026")
    expect(trns).toContain("Business Checking")
    expect(trns).toContain("-425.99")
    expect(spl).toContain("Repairs & Maintenance")
    expect(spl).toContain("425.99")
    expect(spl).toContain("Unit 101 - Test Driver - Brake job")
  })

  it("strips tabs and newlines from free-text memo fields (IIF is tab-delimited)", async () => {
    queryMock.mockResolvedValue([
      {
        incurred_on: new Date("2026-07-04T00:00:00.000Z"),
        category: "other",
        amount_cents: 1000,
        truck: null,
        driver: null,
        memo: "line1\tline2\nline3",
      },
    ])
    const { iif } = await exportQboIif(CARRIER)
    const spl = iif.split("\r\n").find((l) => l.startsWith("SPL\t"))
    expect(spl?.split("\t")).toHaveLength(9)
    expect(spl).toContain("line1 line2 line3")
  })
})

describe("exportQboArIif (QuickBooks Desktop invoices + payments)", () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it("carrier-guards every join on both queries", async () => {
    queryMock.mockResolvedValue([])
    await exportQboArIif(CARRIER)
    const invoiceSql = String(queryMock.mock.calls[0][0])
    const paymentSql = String(queryMock.mock.calls[1][0])
    expect(invoiceSql).toContain("ON c.id = i.customer_id AND c.carrier_id = i.carrier_id")
    expect(invoiceSql).toContain("ON l.id = i.load_id AND l.carrier_id = i.carrier_id")
    expect(paymentSql).toContain("ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id")
    expect(paymentSql).toContain("ON c.id = i.customer_id AND c.carrier_id = i.carrier_id")
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER])
    expect(queryMock.mock.calls[1][1]).toEqual([CARRIER])
  })

  it("emits a balanced INVOICE block posting A/R against Freight Income with DOCNUM", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          number: "INV-1042",
          customer: "Cascade Produce",
          load: "TT-2201",
          issued_on: new Date("2026-07-01T00:00:00.000Z"),
          amount_cents: 185000,
        },
      ])
      .mockResolvedValueOnce([])
    const { filename, iif } = await exportQboArIif(CARRIER)
    expect(filename).toBe("invoices-payments-qbo.iif")
    const lines = iif.trim().split("\r\n")
    expect(lines[0]).toBe("!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO")
    const trns = lines.find((l) => l.startsWith("TRNS\t"))
    const spl = lines.find((l) => l.startsWith("SPL\t"))
    expect(lines).toContain("ENDTRNS")
    expect(trns).toContain("INVOICE")
    expect(trns).toContain("07/01/2026")
    expect(trns).toContain("Accounts Receivable")
    expect(trns).toContain("\t1850.00\t")
    expect(trns).toContain("INV-1042")
    expect(spl).toContain("Freight Income")
    expect(spl).toContain("\t-1850.00\t")
    expect(spl).toContain("Load TT-2201")
    expect(trns?.split("\t")).toHaveLength(10)
  })

  it("emits a balanced PAYMENT block clearing A/R into the offset account", async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          number: "INV-1042",
          customer: "Cascade Produce",
          paid_on: new Date("2026-07-05T00:00:00.000Z"),
          amount_cents: 185000,
          method: "ach",
          reference: "ACH-889",
        },
      ])
    const { iif } = await exportQboArIif(CARRIER)
    const lines = iif.trim().split("\r\n")
    const trns = lines.find((l) => l.startsWith("TRNS\t"))
    const spl = lines.find((l) => l.startsWith("SPL\t"))
    expect(trns).toContain("PAYMENT")
    expect(trns).toContain("Business Checking")
    expect(trns).toContain("\t1850.00\t")
    expect(trns).toContain("ach ACH-889")
    expect(spl).toContain("Accounts Receivable")
    expect(spl).toContain("\t-1850.00\t")
    expect(spl).toContain("INV-1042")
  })
})
