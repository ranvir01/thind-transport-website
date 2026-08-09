import Link from "next/link"
import { ArrowRight, FileText, Sparkles } from "lucide-react"
import { getAgingSummary, getCustomerStatements } from "@/lib/hub/invoices"
import { getCashCycle } from "@/lib/hub/cash-cycle"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCents } from "@/lib/hub/types"
import { formatHubDateShort } from "@/lib/hub/format-dates"
import { Panel, PageHeader, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"
import { SendStatementButton } from "@/components/hub/SendStatementButton"
import { RowLink } from "@/components/hub/RowLink"
import { ExportSheet } from "@/components/hub/ExportSheet"
import { HelpTip } from "@/components/hub/HelpTip"

export const dynamic = "force-dynamic"

const STATUS_PILL: Record<string, string> = {
  draft: "bg-surface-2 text-fg-2",
  sent: "bg-info-soft text-info",
  partial: "bg-warn-soft text-warn",
  paid: "bg-ok-soft text-ok",
  overdue: "bg-bad-soft text-bad",
  disputed: "bg-accent-soft text-accent-text",
}

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const

export default async function MoneyPage() {
  const user = await requirePermissionPage("money:read")
  const canWrite = can(user.role, "money:write")
  const [aging, statements, cycle] = await Promise.all([
    getAgingSummary(user.carrierId),
    getCustomerStatements(user.carrierId),
    getCashCycle(user.carrierId),
  ])

  const hasInvoices = aging.invoices.length > 0
  const moneyIsEmpty = !hasInvoices && statements.length === 0 && cycle.sampleSize === 0

  const fmtDays = (d: number | null) => (d == null ? "—" : `${d}d`)
  const CYCLE_LEGS = [
    {
      label: "Delivered → POD",
      who: "driver",
      leg: cycle.stats.deliveredToPod,
      // A POD should be in hand within a couple of days of delivery.
      slow: (cycle.stats.deliveredToPod.medianDays ?? 0) > 3,
    },
    {
      label: "POD → invoice",
      who: "office — yours to fix",
      leg: cycle.stats.podToInvoice,
      // The office controls this leg entirely; same-or-next-day is the bar.
      slow: (cycle.stats.podToInvoice.medianDays ?? 0) > 2,
    },
    {
      label: "Invoice → paid",
      who: "customer",
      leg: cycle.stats.invoiceToPaid,
      slow: false,
    },
    {
      label: "Delivered → paid",
      who: "total",
      leg: cycle.stats.deliveredToPaid,
      slow: false,
    },
  ]

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
            <ExportSheet canConnect={user.role === "owner"} />
            <Link
              href="/hub/money/settlements"
              className="hidden md:inline-flex min-h-[44px] items-center rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Settlements
            </Link>
            <Link
              href="/hub/money/expenses"
              className="hidden md:inline-flex min-h-[44px] items-center rounded-control border border-border-strong px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              Expenses
            </Link>
          </div>
        }
      />

      {moneyIsEmpty ? (
        // The AI parser is the front door, not the dropzone plumbing.
        <Panel className="mb-6 p-6 md:p-8">
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-card bg-accent-soft text-accent-text">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-[18px] font-semibold text-fg">
              Paste a rate con — we&apos;ll turn it into your first invoice
            </h2>
            <p className="mt-1.5 text-body-sm text-fg-3">
              Copy the broker&apos;s rate confirmation. LoadOff builds the load, tracks
              delivery, and invoices with the POD attached.
            </p>
            <Link
              href="/hub/loads/paste"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Paste a rate con <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Panel>
      ) : null}

      {/* AR aging — hidden until there is at least one invoice */}
      {hasInvoices ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 hub-stagger">
            {BUCKETS.map((bucket) => (
              <Panel key={bucket} className="p-4">
                <span className={cn("text-[12px] font-medium", aging.buckets[bucket] === 0 ? "text-fg-3" : bucket === "current" ? "text-fg-3" : bucket === "90+" ? "text-bad" : "text-warn")}>
                  {bucket === "current" ? "Current" : `${bucket} days`}
                </span>
                <p className="mt-1.5 font-mono text-xl font-medium tabular-nums text-fg">{fmtCents(aging.buckets[bucket])}</p>
              </Panel>
            ))}
          </div>
          <Panel className="p-4 mb-6">
            <p className="text-body-sm text-fg-2">
              Open receivables:{" "}
              <span className="font-mono text-[22px] font-medium tracking-tight text-accent-text tabular-nums">
                {fmtCents(aging.totalOpenCents)}
              </span>
              <span className="ml-2 text-fg-3">Overdue reminders run daily and skip factored loads.</span>
            </p>
          </Panel>
        </>
      ) : null}

      {/* Cash cycle — how long a dollar takes to come home */}
      {cycle.sampleSize > 0 ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-fg">Cash cycle</h2>
            <HelpTip title="Reading the cycle">
              Median days per leg over the last {cycle.windowDays} days ({cycle.sampleSize} delivered
              loads). The POD→invoice leg is the one the office fully controls — shrinking it is free
              money. A big gap between median and mean means a few loads are stuck, not the process.
              Loads are only counted on legs they&apos;ve finished, so unpaid invoices don&apos;t
              read as zero days.
            </HelpTip>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {CYCLE_LEGS.map(({ label, who, leg, slow }) => (
              <Panel key={label} className="p-4">
                <span className={cn("text-[12px] font-medium", slow ? "text-warn" : "text-fg-3")}>{label}</span>
                <p className={cn("mt-1.5 text-xl font-semibold tabular-nums", slow ? "text-warn" : "text-fg")}>
                  {fmtDays(leg.medianDays)}
                  <span className="ml-2 text-body-xs font-normal text-fg-3">
                    {leg.meanDays != null ? `mean ${fmtDays(leg.meanDays)}` : ""}
                  </span>
                </p>
                <p className="mt-1 text-body-xs text-fg-3">
                  {leg.count} load{leg.count === 1 ? "" : "s"} · {who}
                </p>
              </Panel>
            ))}
          </div>
        </>
      ) : null}
      {cycle.unbilled.count > 0 ? (
        <Panel className="mb-6 p-4">
          <p className="text-body-sm text-fg-2">
            <span className="font-semibold text-warn">
              {cycle.unbilled.count} delivered load{cycle.unbilled.count === 1 ? "" : "s"} with no
              invoice — {fmtCents(cycle.unbilled.totalCents)} not yet billed.
            </span>
            {cycle.unbilled.settledCount > 0 ? (
              <>
                {" "}
                {cycle.unbilled.settledCount} of them already settled to the driver
                ({fmtCents(cycle.unbilled.settledCents)} paid out with nothing billed against it).
              </>
            ) : null}{" "}
            <Link href="/hub/loads?status=pod_received" className="font-semibold text-accent-text underline underline-offset-2">
              Invoice them now
            </Link>
          </p>
        </Panel>
      ) : null}

      {/* Customer statements */}
      {statements.length > 0 ? (
        <>
          <h2 className="text-[15px] font-semibold text-fg mb-3">Customer statements</h2>
          <Panel className="divide-y divide-border mb-8">
            {statements.map((s) => (
              <div key={s.customerId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-fg truncate">{s.customerName}</p>
                  <p className="text-body-xs text-fg-3">
                    {s.invoices.length} open invoice{s.invoices.length === 1 ? "" : "s"}
                    {" · "}
                    {s.billingEmail ?? "no billing email on file"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-accent-text tabular-nums">{fmtCents(s.totalOpenCents)}</span>
                  <a
                    href={`/api/hub/customer-statements/${s.customerId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control border border-border-strong px-3 text-xs font-semibold text-fg-2 hover:bg-hover"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </a>
                  {canWrite ? (
                    <SendStatementButton customerId={s.customerId} disabled={!s.billingEmail} />
                  ) : null}
                </div>
              </div>
            ))}
          </Panel>
        </>
      ) : null}

      {/* Invoice list */}
      {hasInvoices || !moneyIsEmpty ? (
        <h2 className="text-[15px] font-semibold text-fg mb-3">Invoices</h2>
      ) : null}
      {!hasInvoices ? (
        moneyIsEmpty ? null : (
          <EmptyState
            title="No open invoices"
            hint="Deliver a load, collect the POD, and invoice it in one click from the load page."
          />
        )
      ) : (
        <>
          <Panel className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-fg-3">
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
                  <RowLink
                    key={invoice.id}
                    href={`/hub/money/invoices/${invoice.id}`}
                    className="cursor-pointer border-b border-border hover:bg-hover"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/hub/money/invoices/${invoice.id}`} className="font-semibold text-accent-text hover:underline">
                        {invoice.number}
                      </Link>
                      {invoice.factored ? (
                        <span className="ml-2 rounded-pill bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-text">
                          factored
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-fg-2">{invoice.customer_name}</td>
                    <td className="px-4 py-3 text-fg-2">{invoice.load_reference}</td>
                    <td className="px-4 py-3 text-fg-2">{formatHubDateShort(invoice.due_on)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-semibold", STATUS_PILL[invoice.status])}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{invoice.bucket}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-accent-text tabular-nums">{fmtCents(invoice.open_cents)}</td>
                  </RowLink>
                ))}
              </tbody>
            </table>
          </Panel>
          <div className="md:hidden space-y-2 hub-stagger">
            {aging.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/hub/money/invoices/${invoice.id}`} className="block">
                <Panel className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-fg">{invoice.number}</span>
                    <span className={cn("inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-semibold", STATUS_PILL[invoice.status])}>
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-body-sm text-fg-2 mt-1 truncate">
                    {invoice.customer_name} · {invoice.load_reference} · due {formatHubDateShort(invoice.due_on)}
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
