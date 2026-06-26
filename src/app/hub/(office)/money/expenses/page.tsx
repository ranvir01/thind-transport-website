import { listExpenses } from "@/lib/hub/expenses"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks } from "@/lib/hub/fleet"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink } from "@/components/hub/ui"
import { ExpenseForm } from "@/components/hub/MoneyForms"

export const dynamic = "force-dynamic"

export default async function ExpensesPage() {
  const user = await requirePermissionPage("money:read")
  const [expenses, drivers, trucks] = await Promise.all([
    listExpenses(user.carrierId),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
  ])

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader title="Expenses" subtitle="Reimbursables flow to settlements; everything feeds the per-truck P&L." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {can(user.role, "money:write") ? (
          <ExpenseForm
            drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
            trucks={trucks.map((t) => ({ id: t.id, label: `#${t.unit_number}` }))}
          />
        ) : null}
        <Panel className="divide-y divide-border max-h-[70vh] overflow-y-auto">
          {expenses.length === 0 ? (
            <p className="p-5 text-body-sm text-fg-3">No expenses yet.</p>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-2 p-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-fg capitalize">
                    {expense.category}
                    {expense.memo ? <span className="font-normal text-fg-2"> — {expense.memo}</span> : null}
                  </p>
                  <p className="text-body-xs text-fg-3">
                    {String(expense.incurred_on).slice(0, 10)}
                    {expense.truck_unit ? ` · #${expense.truck_unit}` : ""}
                    {expense.driver_name ? ` · ${expense.driver_name}` : ""}
                    {expense.reimbursable ? ` · reimbursable${expense.settled_line_id ? " (settled)" : ""}` : ""}
                  </p>
                </div>
                <span className="font-mono font-medium text-accent-text tabular-nums shrink-0">{fmtCentsExact(expense.amount_cents)}</span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}
