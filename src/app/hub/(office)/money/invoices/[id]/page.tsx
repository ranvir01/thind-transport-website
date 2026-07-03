import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { getInvoice } from "@/lib/hub/invoices"
import { query } from "@/lib/hub/db"
import { requirePermissionPage } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { fmtCentsExact } from "@/lib/hub/types"
import { Panel, PageHeader, BackLink } from "@/components/hub/ui"
import { RecordPaymentForm, InvoiceActions } from "@/components/hub/MoneyActions"

export const dynamic = "force-dynamic"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("money:read")
  const { id } = await params
  const invoice = await getInvoice(user.carrierId, id).catch(() => null)
  if (!invoice) notFound()

  const payments = await query<{ id: string; amount_cents: number; paid_on: string; method: string | null; reference: string | null }>(
    `SELECT id, amount_cents, paid_on, method, reference FROM hub.payments WHERE invoice_id = $1 ORDER BY paid_on`,
    [id]
  )
  const openCents = invoice.amount_cents - (invoice.paid_cents ?? 0)
  const canWrite = can(user.role, "money:write")

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.customer_name} · ${invoice.load_reference}${invoice.factored ? " · Factored (NOA)" : ""}`}
        action={
          invoice.pdf_url ? (
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover"
            >
              <FileText className="h-4 w-4" /> Invoice PDF
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-fg-2">Status</dt><dd className="text-fg font-semibold uppercase">{invoice.status}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Issued</dt><dd className="text-fg font-semibold">{String(invoice.issued_on).slice(0, 10)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Due</dt><dd className="text-fg font-semibold">{String(invoice.due_on).slice(0, 10)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Amount</dt><dd className="text-fg font-semibold">{fmtCentsExact(invoice.amount_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-2">Paid</dt><dd className="text-fg font-semibold">{fmtCentsExact(invoice.paid_cents ?? 0)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-fg font-bold">Open balance</dt>
                <dd className="font-display text-accent-text font-extrabold text-lg">{fmtCentsExact(openCents)}</dd>
              </div>
            </dl>
            {invoice.remit_to ? (
              <div className="mt-4 rounded-lg border border-border p-3">
                <p className="text-label text-fg-3 uppercase mb-1">
                  Remit to {invoice.factored ? "(factoring company — Notice of Assignment)" : ""}
                </p>
                <p className="text-body-sm text-fg-2 whitespace-pre-line">{invoice.remit_to}</p>
              </div>
            ) : null}
            <p className="mt-3 text-body-xs text-fg-3">
              Load: <Link href={`/hub/loads/${invoice.load_id}`} className="text-accent-text">{invoice.load_reference}</Link>
            </p>
          </Panel>

          {canWrite ? <InvoiceActions invoiceId={id} factored={invoice.factored} disputed={invoice.status === "disputed"} /> : null}

          {/* Send log */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Send log</h2>
            {(invoice.sent_log ?? []).length === 0 ? (
              <p className="text-body-sm text-fg-3">Not emailed yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {invoice.sent_log.map((entry, i) => (
                  <li key={i} className="text-body-sm text-fg-2">
                    <span className="uppercase text-body-xs font-bold text-fg-3">{entry.kind}</span>{" "}
                    → {entry.to} · {new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {canWrite && openCents > 0 ? (
            <Panel className="p-4 md:p-5">
              <h2 className="text-[13.5px] font-semibold text-fg mb-3">Record payment</h2>
              <RecordPaymentForm invoiceId={id} openCents={openCents} />
            </Panel>
          ) : null}

          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">Payments</h2>
            {payments.length === 0 ? (
              <p className="text-body-sm text-fg-3">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-fg-2">
                      {String(payment.paid_on).slice(0, 10)}
                      {payment.method ? ` · ${payment.method}` : ""}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                    <span className="font-semibold text-emerald-300">{fmtCentsExact(payment.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
