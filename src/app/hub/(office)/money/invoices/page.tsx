import Link from "next/link"
import { listInvoices } from "@/lib/hub/invoices"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents, type InvoiceStatus } from "@/lib/hub/types"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import { Panel, PageHeader, BackLink, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  draft: "bg-surface-2 text-fg-2 border-border-strong",
  sent: "bg-info-soft text-info border-info-soft",
  partial: "bg-warn-soft text-warn border-warn-soft",
  paid: "bg-ok-soft text-ok border-ok-soft",
  overdue: "bg-bad-soft text-bad border-bad-soft",
  disputed: "bg-accent-soft text-accent-text border-accent-soft",
}

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "disputed", label: "Disputed" },
  { value: "paid", label: "Paid" },
]

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await requirePermissionPage("money:read")
  const params = await searchParams
  const status = FILTERS.some((f) => f.value === params.status) ? params.status! : "all"
  const invoices = await listInvoices(user.carrierId, { status })

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader
        title="Invoices"
        subtitle="Every invoice, paid or open. AR aging lives on the Money overview."
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/hub/money/invoices" : `/hub/money/invoices?status=${f.value}`}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-semibold border",
              status === f.value
                ? "bg-accent-soft text-accent-text border-transparent"
                : "border-border-strong text-fg-2 hover:bg-hover"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title={status === "all" ? "No invoices yet" : `No ${status} invoices`}
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
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const openCents = invoice.amount_cents - (invoice.paid_cents ?? 0)
                  return (
                    <tr key={invoice.id} className="border-b border-border hover:bg-hover">
                      <td className="px-4 py-3">
                        <Link href={`/hub/money/invoices/${invoice.id}`} className="font-semibold text-accent-text hover:underline">
                          {invoice.number}
                        </Link>
                        {invoice.factored ? <span className="ml-2 text-body-xs text-accent-text font-bold">FACTORED</span> : null}
                      </td>
                      <td className="px-4 py-3 text-fg-2">{invoice.customer_name}</td>
                      <td className="px-4 py-3 text-fg-2">{invoice.load_reference}</td>
                      <td className="px-4 py-3 text-fg-2">{formatHubDateShort(invoice.issued_on)}</td>
                      <td className="px-4 py-3 text-fg-2">{formatHubDateShort(invoice.due_on)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_PILL[invoice.status as InvoiceStatus])}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-fg-2 tabular-nums">{fmtCents(invoice.amount_cents)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-accent-text tabular-nums">
                        {invoice.status === "paid" ? "—" : fmtCents(openCents)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
          <div className="md:hidden space-y-2">
            {invoices.map((invoice) => {
              const openCents = invoice.amount_cents - (invoice.paid_cents ?? 0)
              return (
                <Link key={invoice.id} href={`/hub/money/invoices/${invoice.id}`} className="block">
                  <Panel className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-fg">{invoice.number}</span>
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase", STATUS_PILL[invoice.status as InvoiceStatus])}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-body-sm text-fg-2 mt-1 truncate">
                      {invoice.customer_name} · {invoice.load_reference} · due {formatHubDateShort(invoice.due_on)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-body-xs text-fg-3">{fmtCents(invoice.amount_cents)}</span>
                      <span className="font-mono font-medium text-accent-text tabular-nums">
                        {invoice.status === "paid" ? "settled" : `${fmtCents(openCents)} open`}
                      </span>
                    </div>
                  </Panel>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
