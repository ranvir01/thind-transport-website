import { query } from "./db"
import { logAudit } from "./audit"
import { assertCarrierRefs } from "./tenancy"
import { toCsv } from "./csv"
import { toIsoDateOnly } from "./format-dates"
import type { Expense, ExpenseCategory } from "./types"

export async function listExpenses(carrierId: string, limit = 200): Promise<Expense[]> {
  return query<Expense>(
    `SELECT e.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.expenses e
     LEFT JOIN hub.trucks t ON t.id = e.truck_id AND t.carrier_id = e.carrier_id
     LEFT JOIN hub.drivers d ON d.id = e.driver_id AND d.carrier_id = e.carrier_id
     WHERE e.carrier_id = $1 ORDER BY e.incurred_on DESC, e.created_at DESC LIMIT ${Math.min(limit, 1000)}`,
    [carrierId]
  )
}

export async function createExpense(
  carrierId: string,
  input: {
    category: ExpenseCategory
    amountCents: number
    incurredOn: string
    truckId?: string | null
    driverId?: string | null
    loadId?: string | null
    reimbursable: boolean
    billable: boolean
    memo?: string | null
  },
  actor: { id: string; name: string }
): Promise<void> {
  await assertCarrierRefs(carrierId, {
    truck_id: input.truckId,
    driver_id: input.driverId,
    load_id: input.loadId,
  })
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.expenses (carrier_id, category, amount_cents, incurred_on, truck_id, driver_id, load_id, reimbursable, billable, memo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      carrierId, input.category, input.amountCents, input.incurredOn,
      input.truckId ?? null, input.driverId ?? null, input.loadId ?? null,
      input.reimbursable, input.billable, input.memo ?? null,
    ]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "expense", entityId: rows[0].id, action: "create", newValue: input,
  })
}

// ---- Per-truck P&L ----

export interface TruckPnl {
  truck_id: string
  unit_number: string
  revenue_cents: string
  fuel_cents: string
  maintenance_cents: string
  other_expense_cents: string
  toll_cents: string
  loaded_miles: string | null
  deadhead_miles: string | null
  net_cents: number
}

export async function truckPnl(carrierId: string, days = 92): Promise<TruckPnl[]> {
  const rows = await query<TruckPnl>(
    `SELECT t.id AS truck_id, t.unit_number,
       COALESCE((SELECT SUM(l.linehaul_cents + l.fuel_surcharge_cents) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval), 0) AS revenue_cents,
       COALESCE((SELECT SUM(f.total_cents) FROM hub.fuel_transactions f
         WHERE f.truck_id = t.id AND f.carrier_id = t.carrier_id AND f.ts >= NOW() - ($2 || ' days')::interval), 0) AS fuel_cents,
       COALESCE((SELECT SUM(m.cost_cents) FROM hub.maintenance_records m
         WHERE m.truck_id = t.id AND m.carrier_id = t.carrier_id AND m.done_on >= (NOW() - ($2 || ' days')::interval)::date), 0) AS maintenance_cents,
       COALESCE((SELECT SUM(e.amount_cents) FROM hub.expenses e
         WHERE e.truck_id = t.id AND e.carrier_id = t.carrier_id AND e.category NOT IN ('fuel','maintenance')
           AND e.incurred_on >= (NOW() - ($2 || ' days')::interval)::date), 0) AS other_expense_cents,
       COALESCE((SELECT SUM(x.amount_cents) FROM hub.toll_transactions x
         WHERE x.truck_id = t.id AND x.carrier_id = t.carrier_id AND x.ts >= NOW() - ($2 || ' days')::interval), 0) AS toll_cents,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval) AS loaded_miles,
       (SELECT SUM(l.deadhead_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval) AS deadhead_miles,
       0 AS net_cents
     FROM hub.trucks t
     WHERE t.carrier_id = $1 AND t.deleted_at IS NULL
     ORDER BY t.unit_number`,
    [carrierId, days]
  )
  return rows.map((row) => ({
    ...row,
    net_cents:
      Number(row.revenue_cents) - Number(row.fuel_cents) -
      Number(row.maintenance_cents) - Number(row.other_expense_cents) - Number(row.toll_cents),
  }))
}

// ---- QuickBooks-importable CSV exports ----

/**
 * Bad caller input, not a server fault: the message is written for the caller
 * and is safe to return. Everything else out of exportCsv is a real failure
 * whose message can quote SQL and table names, so it must not be echoed.
 */
export class ExportInputError extends Error {}

/**
 * 1099-NEC filing year. Absent → the PREVIOUS calendar year, because the forms
 * are filed in Q1 for the year that just closed; defaulting to "now" returned
 * an empty CSV for every January filing run. An explicit year is validated and
 * never silently replaced — a tax export for the wrong year is worse than an
 * error the caller can see.
 */
function resolve1099Year(year: number | undefined): number {
  const maxYear = new Date().getFullYear() + 1
  if (year === undefined) return new Date().getFullYear() - 1
  if (!Number.isInteger(year) || year < 2000 || year > maxYear) {
    throw new ExportInputError(`Pick a filing year between 2000 and ${maxYear}`)
  }
  return year
}

export async function exportCsv(
  carrierId: string,
  kind: string,
  options: { year?: number } = {}
): Promise<{ filename: string; csv: string }> {
  const { isSimulation } = await import("./mode")
  const sim = await isSimulation()
  const wrap = (filename: string, csv: string) =>
    sim
      ? { filename: `SIMULATION-${filename}`, csv: `"SIMULATION — NOT A REAL DOCUMENT"\n${csv}` }
      : { filename, csv }

  switch (kind) {
    case "invoices": {
      const rows = await query<Record<string, unknown>>(
        `SELECT i.number, c.name AS customer, l.reference AS load, i.issued_on, i.due_on,
           ROUND(i.amount_cents / 100.0, 2) AS amount, i.status, i.factored
         FROM hub.invoices i
         JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id
         JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id
         WHERE i.carrier_id = $1 ORDER BY i.issued_on`,
        [carrierId]
      )
      return wrap(
        "invoices.csv",
        toCsv(
          ["InvoiceNo", "Customer", "Load", "InvoiceDate", "DueDate", "Amount", "Status", "Factored"],
          rows.map((r) => [r.number, r.customer, r.load, toIsoDateOnly(r.issued_on) ?? "", toIsoDateOnly(r.due_on) ?? "", r.amount, r.status, r.factored])
        )
      )
    }
    case "payments": {
      const rows = await query<Record<string, unknown>>(
        `SELECT i.number, p.paid_on, ROUND(p.amount_cents / 100.0, 2) AS amount, p.method, p.reference
         FROM hub.payments p JOIN hub.invoices i ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id
         WHERE p.carrier_id = $1 ORDER BY p.paid_on`,
        [carrierId]
      )
      return {
        filename: "payments.csv",
        csv: toCsv(
          ["InvoiceNo", "PaymentDate", "Amount", "Method", "Reference"],
          rows.map((r) => [r.number, toIsoDateOnly(r.paid_on) ?? "", r.amount, r.method, r.reference])
        ),
      }
    }
    case "expenses": {
      const rows = await query<Record<string, unknown>>(
        `SELECT e.incurred_on, e.category, ROUND(e.amount_cents / 100.0, 2) AS amount,
           t.unit_number AS truck, d.first_name || ' ' || d.last_name AS driver, e.memo
         FROM hub.expenses e
         LEFT JOIN hub.trucks t ON t.id = e.truck_id AND t.carrier_id = e.carrier_id
         LEFT JOIN hub.drivers d ON d.id = e.driver_id AND d.carrier_id = e.carrier_id
         WHERE e.carrier_id = $1 ORDER BY e.incurred_on`,
        [carrierId]
      )
      return {
        filename: "expenses.csv",
        csv: toCsv(
          ["Date", "Category", "Amount", "Truck", "Driver", "Memo"],
          rows.map((r) => [toIsoDateOnly(r.incurred_on) ?? "", r.category, r.amount, r.truck, r.driver, r.memo])
        ),
      }
    }
    case "lanes": {
      const rows = await query<Record<string, unknown>>(
        `SELECT origin_city, origin_state, dest_city, dest_state, loads_count,
           ROUND(revenue_cents / 100.0, 2) AS revenue, miles,
           ROUND(margin_cents / 100.0, 2) AS est_margin,
           ROUND(COALESCE(avg_rpm_cents, 0) / 100.0, 2) AS avg_rpm
         FROM hub.lanes WHERE carrier_id = $1 ORDER BY margin_cents DESC`,
        [carrierId]
      )
      return {
        filename: "lanes.csv",
        csv: toCsv(
          ["Origin", "OriginState", "Destination", "DestState", "Loads", "Revenue", "Miles", "EstMargin", "AvgRPM"],
          rows.map((r) => [r.origin_city, r.origin_state, r.dest_city, r.dest_state, r.loads_count, r.revenue, r.miles, r.est_margin, r.avg_rpm])
        ),
      }
    }
    case "settlements": {
      const rows = await query<Record<string, unknown>>(
        `SELECT d.first_name || ' ' || d.last_name AS driver, s.period_start, s.period_end,
           ROUND(s.gross_cents / 100.0, 2) AS gross, ROUND(s.deductions_cents / 100.0, 2) AS deductions,
           ROUND(s.net_cents / 100.0, 2) AS net, s.status
         FROM hub.settlements s JOIN hub.drivers d ON d.id = s.driver_id AND d.carrier_id = s.carrier_id
         WHERE s.carrier_id = $1 ORDER BY s.period_end`,
        [carrierId]
      )
      return wrap(
        "settlements.csv",
        toCsv(
          ["Driver", "PeriodStart", "PeriodEnd", "Gross", "Deductions", "NetPay", "Status"],
          rows.map((r) => [r.driver, toIsoDateOnly(r.period_start) ?? "", toIsoDateOnly(r.period_end) ?? "", r.gross, r.deductions, r.net, r.status])
        )
      )
    }
    case "1099": {
      const year = resolve1099Year(options.year)
      const rows = await query<Record<string, unknown>>(
        `SELECT d.first_name || ' ' || d.last_name AS payee,
           ROUND(SUM(s.gross_cents - COALESCE(reimb.cents, 0)) / 100.0, 2) AS nonemployee_compensation
         FROM hub.settlements s
         JOIN hub.drivers d ON d.id = s.driver_id AND d.carrier_id = s.carrier_id AND d.pay_type = 'percentage'
         LEFT JOIN LATERAL (
           SELECT SUM(amount_cents) AS cents FROM hub.settlement_lines
           WHERE settlement_id = s.id AND kind = 'reimbursement'
         ) reimb ON TRUE
         WHERE s.carrier_id = $1 AND s.status IN ('approved','paid')
           AND EXTRACT(YEAR FROM s.period_end) = $2
         GROUP BY d.id, payee ORDER BY payee`,
        [carrierId, year]
      )
      return wrap(
        `1099-nec-${year}.csv`,
        toCsv(
          ["Payee", "Box1_NonemployeeCompensation", "Year"],
          rows.map((r) => [r.payee, r.nonemployee_compensation, year])
        )
      )
    }
    case "pnl": {
      const rows = await truckPnl(carrierId, 365)
      return {
        filename: "per-truck-pnl.csv",
        csv: toCsv(
          ["Truck", "Revenue", "Fuel", "Maintenance", "Tolls", "OtherExpenses", "Net", "LoadedMiles", "NetPerMile"],
          rows.map((r) => [
            r.unit_number,
            (Number(r.revenue_cents) / 100).toFixed(2),
            (Number(r.fuel_cents) / 100).toFixed(2),
            (Number(r.maintenance_cents) / 100).toFixed(2),
            (Number(r.toll_cents) / 100).toFixed(2),
            (Number(r.other_expense_cents) / 100).toFixed(2),
            (r.net_cents / 100).toFixed(2),
            r.loaded_miles ?? 0,
            r.loaded_miles ? (r.net_cents / 100 / Number(r.loaded_miles)).toFixed(2) : "",
          ])
        ),
      }
    }
    default:
      throw new Error(`Unknown export: ${kind}`)
  }
}

// ---- QuickBooks Desktop IIF export (general journal) ----
//
// QBO's "Push invoice" flow (integrations/qbo.ts) resolves customers/items by
// name string, never a stored id — no hub.customers column maps to a QBO
// entity, so this follows the same no-migration pattern: a hardcoded
// category -> QBO expense-account name table, same spirit as the hardcoded
// "Freight Service" item name over there.
const QBO_ACCOUNT_BY_CATEGORY: Record<ExpenseCategory, string> = {
  fuel: "Fuel Expense",
  tolls: "Tolls & Permits",
  maintenance: "Repairs & Maintenance",
  insurance: "Insurance Expense",
  permits: "Tolls & Permits",
  parking: "Tolls & Permits",
  lumper: "Lumper Fees",
  other: "Other Business Expenses",
}

const QBO_OFFSET_ACCOUNT = "Business Checking"

function iifField(value: unknown): string {
  // IIF is tab/newline delimited — strip both from free-text fields.
  return String(value ?? "").replace(/[\t\r\n]+/g, " ").trim()
}

function iifDate(isoDate: string | null): string {
  const iso = toIsoDateOnly(isoDate)
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${m}/${d}/${y}`
}

export async function exportQboIif(carrierId: string): Promise<{ filename: string; iif: string }> {
  const rows = await query<{
    incurred_on: string
    category: ExpenseCategory
    amount_cents: number
    truck: string | null
    driver: string | null
    memo: string | null
  }>(
    `SELECT e.incurred_on, e.category, e.amount_cents,
       t.unit_number AS truck, d.first_name || ' ' || d.last_name AS driver, e.memo
     FROM hub.expenses e
     LEFT JOIN hub.trucks t ON t.id = e.truck_id AND t.carrier_id = e.carrier_id
     LEFT JOIN hub.drivers d ON d.id = e.driver_id AND d.carrier_id = e.carrier_id
     WHERE e.carrier_id = $1 ORDER BY e.incurred_on`,
    [carrierId]
  )

  const lines: string[] = [
    "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO",
    "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO",
    "!ENDTRNS",
  ]
  for (const r of rows) {
    const date = iifDate(r.incurred_on)
    const amount = (r.amount_cents / 100).toFixed(2)
    const memoParts = [r.truck ? `Unit ${r.truck}` : null, r.driver, r.memo].filter(Boolean)
    const memo = iifField(memoParts.join(" - "))
    const account = QBO_ACCOUNT_BY_CATEGORY[r.category]
    const name = iifField(r.driver ?? "")
    lines.push(`TRNS\t\tGENERAL JOURNAL\t${date}\t${QBO_OFFSET_ACCOUNT}\t${name}\t\t-${amount}\t${memo}`)
    lines.push(`SPL\t\tGENERAL JOURNAL\t${date}\t${account}\t${name}\t\t${amount}\t${memo}`)
    lines.push("ENDTRNS")
  }
  return { filename: "expenses-qbo.iif", iif: lines.join("\r\n") + "\r\n" }
}

// ---- QuickBooks Desktop IIF export: revenue, receipts, payroll ----
//
// Same general-journal pattern as exportQboIif above (no customer/vendor list
// sync, just posted balanced entries): positive amount = debit, negative =
// credit. Kept as separate exports (not one combined file) so a bookkeeper
// importing AR activity isn't forced to also import payroll in one shot.

const IIF_HEADER = [
  "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO",
  "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tMEMO",
  "!ENDTRNS",
]

const QBO_AR_ACCOUNT = "Accounts Receivable"
const QBO_REVENUE_ACCOUNT = "Freight Revenue"
const QBO_DRIVER_PAY_ACCOUNT = "Driver Pay Expense"
const QBO_DEDUCTIONS_ACCOUNT = "Driver Deductions Payable"

export async function exportQboIifInvoices(carrierId: string): Promise<{ filename: string; iif: string }> {
  const rows = await query<{
    number: string
    customer: string
    load_ref: string
    amount_cents: number
    issued_on: string
  }>(
    `SELECT i.number, c.name AS customer, l.reference AS load_ref, i.amount_cents, i.issued_on
     FROM hub.invoices i
     JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id
     JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id
     WHERE i.carrier_id = $1 ORDER BY i.issued_on`,
    [carrierId]
  )

  const lines = [...IIF_HEADER]
  for (const r of rows) {
    const date = iifDate(r.issued_on)
    const amount = (r.amount_cents / 100).toFixed(2)
    const name = iifField(r.customer)
    const memo = iifField(`Invoice ${r.number} - ${r.load_ref}`)
    lines.push(`TRNS\t\tGENERAL JOURNAL\t${date}\t${QBO_AR_ACCOUNT}\t${name}\t\t${amount}\t${memo}`)
    lines.push(`SPL\t\tGENERAL JOURNAL\t${date}\t${QBO_REVENUE_ACCOUNT}\t${name}\t\t-${amount}\t${memo}`)
    lines.push("ENDTRNS")
  }
  return { filename: "invoices-qbo.iif", iif: lines.join("\r\n") + "\r\n" }
}

export async function exportQboIifPayments(carrierId: string): Promise<{ filename: string; iif: string }> {
  const rows = await query<{
    number: string
    customer: string
    amount_cents: number
    paid_on: string
    reference: string | null
  }>(
    `SELECT i.number, c.name AS customer, p.amount_cents, p.paid_on, p.reference
     FROM hub.payments p
     JOIN hub.invoices i ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id
     JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id
     WHERE p.carrier_id = $1 ORDER BY p.paid_on`,
    [carrierId]
  )

  const lines = [...IIF_HEADER]
  for (const r of rows) {
    const date = iifDate(r.paid_on)
    const amount = (r.amount_cents / 100).toFixed(2)
    const name = iifField(r.customer)
    const memo = iifField([`Payment on ${r.number}`, r.reference].filter(Boolean).join(" - "))
    lines.push(`TRNS\t\tGENERAL JOURNAL\t${date}\t${QBO_OFFSET_ACCOUNT}\t${name}\t\t${amount}\t${memo}`)
    lines.push(`SPL\t\tGENERAL JOURNAL\t${date}\t${QBO_AR_ACCOUNT}\t${name}\t\t-${amount}\t${memo}`)
    lines.push("ENDTRNS")
  }
  return { filename: "payments-qbo.iif", iif: lines.join("\r\n") + "\r\n" }
}

export async function exportQboIifSettlements(carrierId: string): Promise<{ filename: string; iif: string }> {
  const rows = await query<{
    driver: string
    period_end: string
    gross_cents: number
    deductions_cents: number
    net_cents: number
  }>(
    `SELECT d.first_name || ' ' || d.last_name AS driver, s.period_end,
       s.gross_cents, s.deductions_cents, s.net_cents
     FROM hub.settlements s
     JOIN hub.drivers d ON d.id = s.driver_id AND d.carrier_id = s.carrier_id
     WHERE s.carrier_id = $1 AND s.status = 'paid' ORDER BY s.period_end`,
    [carrierId]
  )

  const lines = [...IIF_HEADER]
  for (const r of rows) {
    const date = iifDate(r.period_end)
    const name = iifField(r.driver)
    const memo = iifField(`Settlement - ${r.driver} - period ending ${date}`)
    const gross = (r.gross_cents / 100).toFixed(2)
    const net = (r.net_cents / 100).toFixed(2)
    lines.push(`TRNS\t\tGENERAL JOURNAL\t${date}\t${QBO_DRIVER_PAY_ACCOUNT}\t${name}\t\t${gross}\t${memo}`)
    lines.push(`SPL\t\tGENERAL JOURNAL\t${date}\t${QBO_OFFSET_ACCOUNT}\t${name}\t\t-${net}\t${memo}`)
    if (r.deductions_cents > 0) {
      const deductions = (r.deductions_cents / 100).toFixed(2)
      lines.push(`SPL\t\tGENERAL JOURNAL\t${date}\t${QBO_DEDUCTIONS_ACCOUNT}\t${name}\t\t-${deductions}\t${memo}`)
    }
    lines.push("ENDTRNS")
  }
  return { filename: "settlements-qbo.iif", iif: lines.join("\r\n") + "\r\n" }
}
