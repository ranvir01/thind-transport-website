import Link from "next/link"
import { Plus } from "lucide-react"
import { listCustomers } from "@/lib/hub/customers"
import { requireOfficeUser } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  on_hold: "bg-warn-soft text-warn border-warn-soft",
  blacklisted: "bg-red-500/15 text-red-300 border-red-400/30",
}

export default async function CustomersPage() {
  const user = await requireOfficeUser()
  const customers = await listCustomers(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Brokers and shippers — your book of business."
        action={
          <Link
            href="/hub/customers/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Add customer
          </Link>
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          hint="Add the brokers you haul for, or import your spreadsheet — customers are created automatically."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/hub/customers/${customer.id}`}>
              <Panel className="p-4 h-full hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-fg text-base truncate">{customer.name}</span>
                  <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[customer.status])}>
                    {customer.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-body-sm text-fg-2 mt-1 capitalize">
                  {customer.type}
                  {customer.mc_number ? ` · MC ${customer.mc_number}` : ""}
                  {` · Net ${customer.payment_terms_days}`}
                </p>
                <div className="mt-3 flex items-center justify-between text-body-sm">
                  <span className="text-fg-3">{customer.load_count} loads{customer.avg_days_to_pay ? ` · pays in ${Math.round(Number(customer.avg_days_to_pay))}d` : ""}</span>
                  <span className="font-mono font-medium text-accent-text tabular-nums">{fmtCents(Number(customer.total_revenue_cents))}</span>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
