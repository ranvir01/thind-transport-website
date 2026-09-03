import { listExpenses } from "@/lib/hub/expenses"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCentsExact } from "@/lib/hub/types"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import Link from "next/link"
import { Panel, PageHeader, BackLink, EmptyState, moneyCls } from "@/components/hub/ui"
import { ExpenseForm } from "@/components/hub/MoneyForms"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ExpensesPage() {
  const user = await requirePermissionPage("money:read")
  const [expenses, drivers, trucks] = await Promise.all([
    listExpenses(user.carrierId),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
  ])
  const canWrite = can(user.role, "money:write")

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader title="Expenses" subtitle="Reimbursables flow to settlements; everything feeds the per-truck P&L." />
      {/* id + scroll-mt on the grid itself: the form is its first child, so the
          empty state's "Record an expense" link lands on the form without
          wrapping it in a div (which would stop the panel stretching to row height). */}
      <div id="record-expense" className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-[var(--chrome-h)]">
        {canWrite ? (
          <ExpenseForm
            drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
            trucks={trucks.map((t) => ({ id: t.id, label: `#${t.unit_number}` }))}
          />
        ) : null}
        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses yet."
            hint="Log fuel-adjacent costs, repairs, and driver reimbursements here — every one lands on the per-truck P&L."
            action={
              canWrite ? (
                <Link
                  href="#record-expense"
                  className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                >
                  Record an expense
                </Link>
              ) : (
                <Link
                  href="/hub/money"
                  className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg-2 hover:bg-hover"
                >
                  Back to Money
                </Link>
              )
            }
          />
        ) : (
          <Panel className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-2 p-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-fg capitalize">
                    {expense.category}
                    {expense.memo ? <span className="font-normal normal-case text-fg-2"> — {expense.memo}</span> : null}
                  </p>
                  <p className="text-body-xs text-fg-3">
                    {formatHubDateShort(expense.incurred_on)}
                    {expense.truck_unit ? ` · #${expense.truck_unit}` : ""}
                    {expense.driver_name ? ` · ${expense.driver_name}` : ""}
                    {expense.reimbursable ? ` · reimbursable${expense.settled_line_id ? " (settled)" : ""}` : ""}
                  </p>
                </div>
                <span className={cn(moneyCls, "shrink-0 text-accent-text")}>{fmtCentsExact(expense.amount_cents)}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  )
}
