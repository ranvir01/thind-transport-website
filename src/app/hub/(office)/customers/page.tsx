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
  on_hold: "bg-gold-500/15 text-gold-300 border-gold-400/30",
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange px-5 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400"
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
              <Panel className="p-4 h-full hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-base truncate">{customer.name}</span>
                  <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[customer.status])}>
                    {customer.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-body-sm text-steel-200 mt-1 capitalize">
                  {customer.type}
                  {customer.mc_number ? ` · MC ${customer.mc_number}` : ""}
                  {` · Net ${customer.payment_terms_days}`}
                </p>
                <div className="mt-3 flex items-center justify-between text-body-sm">
                  <span className="text-steel-300">{customer.load_count} loads{customer.avg_days_to_pay ? ` · pays in ${Math.round(Number(customer.avg_days_to_pay))}d` : ""}</span>
                  <span className="font-display font-extrabold text-gold">{fmtCents(Number(customer.total_revenue_cents))}</span>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
