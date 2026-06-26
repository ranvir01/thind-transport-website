import Link from "next/link"
import { Download } from "lucide-react"
import { getAgingSummary } from "@/lib/hub/invoices"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents } from "@/lib/hub/types"
import { Panel, PageHeader, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  draft: "bg-steel-700/60 text-fg-2 border-steel-500/40",
  sent: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  partial: "bg-gold-500/15 text-gold-300 border-gold-400/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  overdue: "bg-red-500/15 text-red-300 border-red-400/30",
  disputed: "bg-violet-500/15 text-violet-300 border-violet-400/30",
}

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const

export default async function MoneyPage() {
  const user = await requirePermissionPage("money:read")
  const aging = await getAgingSummary(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Money"
        subtitle="Receivables, invoices, and driver pay."
        titleExtra={
          <HelpTip title="AR aging, in plain words">
            &quot;Aging&quot; is just how long invoices have sat unpaid, bucketed by 30-day
            steps. Current is fine; 31–60 needs a friendly call; 90+ is a collections
            conversation. Factored loads skip dunning — the factor owns the chase.
          </HelpTip>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/hub/money/settlements" className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              Settlements
            </Link>
            <Link href="/hub/money/advances" className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              Advances
            </Link>
            <Link href="/hub/money/expenses" className="inline-flex min-h-[44px] items-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover">
              Expenses
            </Link>
          </div>
        }
      />

      {/* AR aging */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {BUCKETS.map((bucket) => (
          <Panel key={bucket} className="p-4">
            <span className={cn("text-label uppercase", bucket === "current" ? "text-fg-3" : bucket === "90+" ? "text-red-300" : "text-gold")}>
              {bucket === "current" ? "Current" : `${bucket} days`}
            </span>
            <p className="mt-2 font-semibold text-xl text-fg">{fmtCents(aging.buckets[bucket])}</p>
          </Panel>
        ))}
      </div>
      <Panel className="p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-fg-2">
          Open receivables:{" "}
          <span className="font-mono font-medium text-accent-text tabular-nums text-lg">{fmtCents(aging.totalOpenCents)}</span>
          <span className="ml-2 text-fg-3">Overdue reminders run daily and skip factored loads.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {["invoices", "payments", "expenses", "settlements", "1099"].map((kind) => (
            <a
              key={kind}
              href={`/api/hub/exports/${kind}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-semibold text-fg-2 hover:bg-hover"
            >
              <Download className="h-3.5 w-3.5" /> {kind === "1099" ? "1099-NEC" : `${kind} CSV`}
            </a>
          ))}
        </div>
      </Panel>

      {/* Invoice list */}
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-fg mb-3">Invoices</h2>
      {aging.invoices.length === 0 ? (
        <EmptyState
          title="No open invoices"
          hint="Deliver a load, collect the POD, and invoice it in one click from the load page."
        />
      ) : (
        <>
          <Panel className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-label text-fg-3 uppercase">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Load</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bucket</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {aging.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-hover">
                    <td className="px-4 py-3">
                      <Link href={`/hub/money/invoices/${invoice.id}`} className="font-semibold text-accent-text hover:underline">
                        {invoice.number}
                      </Link>
                      {invoice.factored ? <span className="ml-2 text-body-xs text-gold font-bold">FACTORED</span> : null}
                    </td>
                    <td className="px-4 py-3 text-fg-2">{invoice.customer_name}</td>
                    <td className="px-4 py-3 text-fg-2">{invoice.load_reference}</td>
                    <td className="px-4 py-3 text-fg-2">{String(invoice.due_on).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[invoice.status])}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{invoice.bucket}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-accent-text tabular-nums">{fmtCents(invoice.open_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <div className="md:hidden space-y-2">
            {aging.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/hub/money/invoices/${invoice.id}`} className="block">
                <Panel className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-fg">{invoice.number}</span>
                    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase", STATUS_PILL[invoice.status])}>
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-body-sm text-fg-2 mt-1 truncate">
                    {invoice.customer_name} · {invoice.load_reference} · due {String(invoice.due_on).slice(0, 10)}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-body-xs text-fg-3">{invoice.bucket}</span>
                    <span className="font-mono font-medium text-accent-text tabular-nums">{fmtCents(invoice.open_cents)}</span>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
