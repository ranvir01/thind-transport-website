import { hubDbAvailable, query } from "./db"
import { logAudit } from "./audit"
import { fallbackDrivers, fallbackInvoices, fallbackLoads, fallbackTrucks } from "./sandbox-fallback"
import type { Expense, ExpenseCategory } from "./types"

export async function listExpenses(carrierId: string, limit = 200): Promise<Expense[]> {
  return query<Expense>(
    `SELECT e.*, t.unit_number AS truck_unit, d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.expenses e
     LEFT JOIN hub.trucks t ON t.id = e.truck_id
     LEFT JOIN hub.drivers d ON d.id = e.driver_id
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
  loaded_miles: string | null
  net_cents: number
}

export async function truckPnl(carrierId: string, days = 92): Promise<TruckPnl[]> {
  const rows = await query<TruckPnl>(
    `SELECT t.id AS truck_id, t.unit_number,
       COALESCE((SELECT SUM(l.linehaul_cents + l.fuel_surcharge_cents) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval), 0) AS revenue_cents,
       COALESCE((SELECT SUM(f.total_cents) FROM hub.fuel_transactions f
         WHERE f.truck_id = t.id AND f.ts >= NOW() - ($2 || ' days')::interval), 0) AS fuel_cents,
       COALESCE((SELECT SUM(m.cost_cents) FROM hub.maintenance_records m
         WHERE m.truck_id = t.id AND m.done_on >= (NOW() - ($2 || ' days')::interval)::date), 0) AS maintenance_cents,
       COALESCE((SELECT SUM(e.amount_cents) FROM hub.expenses e
         WHERE e.truck_id = t.id AND e.category NOT IN ('fuel','maintenance')
           AND e.incurred_on >= (NOW() - ($2 || ' days')::interval)::date), 0) AS other_expense_cents,
       (SELECT SUM(l.loaded_miles) FROM hub.loads l
         WHERE l.truck_id = t.id AND l.deleted_at IS NULL AND l.status <> 'cancelled'
           AND l.created_at >= NOW() - ($2 || ' days')::interval) AS loaded_miles,
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
      Number(row.maintenance_cents) - Number(row.other_expense_cents),
  }))
}

// ---- QuickBooks-importable CSV exports ----

function csvEscape(value: unknown): string {
  const str = String(value ?? "")
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n")
}

export async function exportCsv(carrierId: string, kind: string): Promise<{ filename: string; csv: string }> {
  if (!hubDbAvailable()) return exportFallbackCsv(carrierId, kind)
  switch (kind) {
    case "invoices": {
      const rows = await query<Record<string, unknown>>(
        `SELECT i.number, c.name AS customer, l.reference AS load, i.issued_on, i.due_on,
           ROUND(i.amount_cents / 100.0, 2) AS amount, i.status, i.factored
         FROM hub.invoices i JOIN hub.customers c ON c.id = i.customer_id JOIN hub.loads l ON l.id = i.load_id
         WHERE i.carrier_id = $1 ORDER BY i.issued_on`,
        [carrierId]
      )
      return {
        filename: "invoices.csv",
        csv: toCsv(
          ["InvoiceNo", "Customer", "Load", "InvoiceDate", "DueDate", "Amount", "Status", "Factored"],
          rows.map((r) => [r.number, r.customer, r.load, String(r.issued_on).slice(0, 10), String(r.due_on).slice(0, 10), r.amount, r.status, r.factored])
        ),
      }
    }
    case "payments": {
      const rows = await query<Record<string, unknown>>(
        `SELECT i.number, p.paid_on, ROUND(p.amount_cents / 100.0, 2) AS amount, p.method, p.reference
         FROM hub.payments p JOIN hub.invoices i ON i.id = p.invoice_id
         WHERE p.carrier_id = $1 ORDER BY p.paid_on`,
        [carrierId]
      )
      return {
        filename: "payments.csv",
        csv: toCsv(
          ["InvoiceNo", "PaymentDate", "Amount", "Method", "Reference"],
          rows.map((r) => [r.number, String(r.paid_on).slice(0, 10), r.amount, r.method, r.reference])
        ),
      }
    }
    case "expenses": {
      const rows = await query<Record<string, unknown>>(
        `SELECT e.incurred_on, e.category, ROUND(e.amount_cents / 100.0, 2) AS amount,
           t.unit_number AS truck, d.first_name || ' ' || d.last_name AS driver, e.memo
         FROM hub.expenses e
         LEFT JOIN hub.trucks t ON t.id = e.truck_id LEFT JOIN hub.drivers d ON d.id = e.driver_id
         WHERE e.carrier_id = $1 ORDER BY e.incurred_on`,
        [carrierId]
      )
      return {
        filename: "expenses.csv",
        csv: toCsv(
          ["Date", "Category", "Amount", "Truck", "Driver", "Memo"],
          rows.map((r) => [String(r.incurred_on).slice(0, 10), r.category, r.amount, r.truck, r.driver, r.memo])
        ),
      }
    }
    case "settlements": {
      const rows = await query<Record<string, unknown>>(
        `SELECT d.first_name || ' ' || d.last_name AS driver, s.period_start, s.period_end,
           ROUND(s.gross_cents / 100.0, 2) AS gross, ROUND(s.deductions_cents / 100.0, 2) AS deductions,
           ROUND(s.net_cents / 100.0, 2) AS net, s.status
         FROM hub.settlements s JOIN hub.drivers d ON d.id = s.driver_id
         WHERE s.carrier_id = $1 ORDER BY s.period_end`,
        [carrierId]
      )
      return {
        filename: "settlements.csv",
        csv: toCsv(
          ["Driver", "PeriodStart", "PeriodEnd", "Gross", "Deductions", "NetPay", "Status"],
          rows.map((r) => [r.driver, String(r.period_start).slice(0, 10), String(r.period_end).slice(0, 10), r.gross, r.deductions, r.net, r.status])
        ),
      }
    }
    case "1099": {
      const year = new Date().getFullYear()
      const rows = await query<Record<string, unknown>>(
        `SELECT d.first_name || ' ' || d.last_name AS payee,
           ROUND(SUM(s.gross_cents - COALESCE(reimb.cents, 0)) / 100.0, 2) AS nonemployee_compensation
         FROM hub.settlements s
         JOIN hub.drivers d ON d.id = s.driver_id AND d.pay_type = 'percentage'
         LEFT JOIN LATERAL (
           SELECT SUM(amount_cents) AS cents FROM hub.settlement_lines
           WHERE settlement_id = s.id AND kind = 'reimbursement'
         ) reimb ON TRUE
         WHERE s.carrier_id = $1 AND s.status IN ('approved','paid')
           AND EXTRACT(YEAR FROM s.period_end) = $2
         GROUP BY d.id, payee ORDER BY payee`,
        [carrierId, year]
      )
      return {
        filename: `1099-nec-${year}.csv`,
        csv: toCsv(
          ["Payee", "Box1_NonemployeeCompensation", "Year"],
          rows.map((r) => [r.payee, r.nonemployee_compensation, year])
        ),
      }
    }
    case "pnl": {
      const rows = await truckPnl(carrierId, 365)
      return {
        filename: "per-truck-pnl.csv",
        csv: toCsv(
          ["Truck", "Revenue", "Fuel", "Maintenance", "OtherExpenses", "Net", "LoadedMiles", "NetPerMile"],
          rows.map((r) => [
            r.unit_number,
            (Number(r.revenue_cents) / 100).toFixed(2),
            (Number(r.fuel_cents) / 100).toFixed(2),
            (Number(r.maintenance_cents) / 100).toFixed(2),
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

function exportFallbackCsv(carrierId: string, kind: string): { filename: string; csv: string } {
  const loads = fallbackLoads(carrierId)
  const invoices = fallbackInvoices(carrierId)
  switch (kind) {
    case "invoices":
      return {
        filename: "sandbox-invoices.csv",
        csv: toCsv(
          ["InvoiceNo", "Customer", "Load", "InvoiceDate", "DueDate", "Amount", "Status", "Factored"],
          invoices.map((invoice) => [
            invoice.number,
            invoice.customer_name,
            invoice.load_reference,
            invoice.issued_on,
            invoice.due_on,
            (invoice.amount_cents / 100).toFixed(2),
            invoice.status,
            invoice.factored,
          ])
        ),
      }
    case "payments":
      return {
        filename: "sandbox-payments.csv",
        csv: toCsv(
          ["InvoiceNo", "PaymentDate", "Amount", "Method", "Reference"],
          invoices
            .filter((invoice) => invoice.paid_cents)
            .map((invoice) => [invoice.number, invoice.issued_on, ((invoice.paid_cents ?? 0) / 100).toFixed(2), "ACH", `SB-PMT-${invoice.number}`])
        ),
      }
    case "expenses":
      return {
        filename: "sandbox-expenses.csv",
        csv: toCsv(
          ["Date", "Category", "Amount", "Truck", "Driver", "Memo"],
          fallbackTrucks(carrierId).map((truck, index) => [
            new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
            index % 2 ? "tolls" : "fuel",
            (index % 2 ? 82.5 : 428.75).toFixed(2),
            truck.unit_number,
            truck.driver_name,
            "Sandbox fallback export row",
          ])
        ),
      }
    case "settlements":
      return {
        filename: "sandbox-settlements.csv",
        csv: toCsv(
          ["Driver", "PeriodStart", "PeriodEnd", "Gross", "Deductions", "NetPay", "Status"],
          fallbackDrivers(carrierId).slice(0, 2).map((driver, index) => [
            `${driver.first_name} ${driver.last_name}`,
            new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
            new Date().toISOString().slice(0, 10),
            (index ? 1482.5 : 4125).toFixed(2),
            (index ? 150 : 447).toFixed(2),
            (index ? 1332.5 : 3678).toFixed(2),
            "draft",
          ])
        ),
      }
    case "1099": {
      const year = new Date().getFullYear()
      return {
        filename: `sandbox-1099-nec-${year}.csv`,
        csv: toCsv(
          ["Payee", "Box1_NonemployeeCompensation", "Year"],
          fallbackDrivers(carrierId).map((driver, index) => [`${driver.first_name} ${driver.last_name}`, (index % 2 ? 1482.5 : 4125).toFixed(2), year])
        ),
      }
    }
    case "pnl":
      return {
        filename: "sandbox-per-truck-pnl.csv",
        csv: toCsv(
          ["Truck", "Revenue", "Fuel", "Maintenance", "OtherExpenses", "Net", "LoadedMiles", "NetPerMile"],
          fallbackTrucks(carrierId).map((truck, index) => {
            const revenue = loads.filter((load) => load.truck_unit === truck.unit_number).reduce((sum, load) => sum + load.linehaul_cents + load.fuel_surcharge_cents, 0)
            const fuel = 80000 + index * 2500
            const net = revenue - fuel - 25000
            const miles = 1200 + index * 100
            return [truck.unit_number, (revenue / 100).toFixed(2), (fuel / 100).toFixed(2), "250.00", "0.00", (net / 100).toFixed(2), miles, (net / 100 / miles).toFixed(2)]
          })
        ),
      }
    default:
      throw new Error(`Unknown export: ${kind}`)
  }
}
