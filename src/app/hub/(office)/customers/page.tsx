import Link from "next/link"
import { Plus } from "lucide-react"
import { listCustomers } from "@/lib/hub/customers"
import { requireOfficeUser } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, EmptyState, Pill, moneyCls, btnPrimaryCls } from "@/components/hub/ui"
import type { PillTone } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Tone is data: hauling for them / paused / never again. */
const STATUS_TONE: Record<string, PillTone> = {
  active: "ok",
  on_hold: "warn",
  blacklisted: "bad",
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
          action={
            <Link href="/hub/customers/new" className={btnPrimaryCls}>
              <Plus className="h-4 w-4" /> Add customer
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/hub/customers/${customer.id}`}>
              <Panel className="p-4 h-full hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-fg text-base truncate">{customer.name}</span>
                  <Pill
                    tone={STATUS_TONE[customer.status] ?? "neutral"}
                    size="xs"
                    className="shrink-0 uppercase tracking-wider"
                  >
                    {customer.status.replace("_", " ")}
                  </Pill>
                </div>
                <p className="text-body-sm text-fg-2 mt-1 capitalize">
                  {customer.type}
                  {customer.mc_number ? ` · MC ${customer.mc_number}` : ""}
                  {` · Net ${customer.payment_terms_days}`}
                </p>
                <div className="mt-3 flex items-center justify-between text-body-sm">
                  <span className="text-fg-3">{customer.load_count} loads{customer.avg_days_to_pay ? ` · pays in ${Math.round(Number(customer.avg_days_to_pay))}d` : ""}</span>
                  <span className={cn(moneyCls, "text-accent-text")}>{fmtCents(Number(customer.total_revenue_cents))}</span>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
