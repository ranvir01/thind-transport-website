import Link from "next/link"
import { listInvoices } from "@/lib/hub/invoices"
import { requirePermissionPage } from "@/lib/hub/session"
import { fmtCents, type InvoiceStatus } from "@/lib/hub/types"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import { Panel, PageHeader, BackLink, EmptyState, Pill, moneyCls, tableHeadCls, type PillTone } from "@/components/hub/ui"
import { RowLink } from "@/components/hub/RowLink"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Invoice status → Pill tone. Data-only colour: paid green, overdue red. */
const STATUS_TONE: Record<InvoiceStatus, PillTone> = {
  draft: "neutral",
  sent: "info",
  partial: "warn",
  paid: "ok",
  overdue: "bad",
  disputed: "accent",
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
          action={
            <Link
              href="/hub/loads"
              className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Go to loads
            </Link>
          }
        />
      ) : (
        <>
          <Panel className="hidden md:block overflow-x-auto">
            <table className="hub-table w-full text-sm">
              <thead>
                <tr className={tableHeadCls}>
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
                    <RowLink
                      key={invoice.id}
                      href={`/hub/money/invoices/${invoice.id}`}
                      className="cursor-pointer border-b border-border hover:bg-hover"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/hub/money/invoices/${invoice.id}`} className={cn(moneyCls, "font-semibold text-accent-text hover:underline")}>
                          {invoice.number}
                        </Link>
                        {invoice.factored ? <Pill tone="accent" size="xs" className="ml-2 tracking-wide">FACTORED</Pill> : null}
                      </td>
                      <td className="px-4 py-3 text-fg-2">{invoice.customer_name}</td>
                      <td className="px-4 py-3 text-fg-2">{invoice.load_reference}</td>
                      <td className="px-4 py-3 text-fg-2">{formatHubDateShort(invoice.issued_on)}</td>
                      <td className="px-4 py-3 text-fg-2">{formatHubDateShort(invoice.due_on)}</td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[invoice.status as InvoiceStatus] ?? "neutral"} size="xs" className="uppercase tracking-wide">
                          {invoice.status}
                        </Pill>
                      </td>
                      <td className={cn("px-4 py-3 text-right", moneyCls, "text-fg-2")}>{fmtCents(invoice.amount_cents)}</td>
                      <td className={cn("px-4 py-3 text-right", moneyCls, "text-accent-text")}>
                        {invoice.status === "paid" ? "—" : fmtCents(openCents)}
                      </td>
                    </RowLink>
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
                      <span className={cn(moneyCls, "font-semibold")}>{invoice.number}</span>
                      <Pill tone={STATUS_TONE[invoice.status as InvoiceStatus] ?? "neutral"} size="xs" className="uppercase tracking-wide">
                        {invoice.status}
                      </Pill>
                    </div>
                    <p className="text-body-sm text-fg-2 mt-1 truncate">
                      {invoice.customer_name} · {invoice.load_reference} · due {formatHubDateShort(invoice.due_on)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-body-xs text-fg-3">{fmtCents(invoice.amount_cents)}</span>
                      <span className={cn(moneyCls, "text-accent-text")}>
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
