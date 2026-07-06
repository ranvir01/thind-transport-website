"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, FileText, Loader2, Send } from "lucide-react"
import {
  approveSettlementAction, createInvoiceAction, disputeInvoiceAction,
  draftSettlementsAction, factoringPacketAction, markSettlementPaidAction,
  pushInvoiceToQboAction, recordPaymentAction, submitInvoiceToFactorAction,
} from "@/app/hub/_actions/money"
import { fieldCls, labelCls } from "@/components/hub/ui"

export function CreateInvoiceButton({ loadId, disabled }: { loadId: string; disabled?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const create = () =>
    startTransition(async () => {
      const result = await createInvoiceAction(loadId)
      if (result.ok) {
        toast.success(result.emailed ? "Invoice created and emailed" : "Invoice created (email not sent)")
        if (result.error) toast.info(result.error)
        router.push(`/hub/money/invoices/${result.id}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not create invoice")
      }
    })
  return (
    <button
      onClick={create}
      disabled={pending || disabled}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Invoice this load
    </button>
  )
}

export function RecordPaymentForm({ invoiceId, openCents }: { invoiceId: string; openCents: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    amount: (openCents / 100).toFixed(2),
    paidOn: new Date().toISOString().slice(0, 10),
    method: "ACH",
    reference: "",
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await recordPaymentAction(invoiceId, form)
      if (result.ok) {
        toast.success("Payment recorded")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not record payment")
      }
    })
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls} htmlFor="pay_amount">Amount ($)</label>
        <input id="pay_amount" type="number" step="0.01" min="0.01" required className={fieldCls}
          value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} htmlFor="pay_date">Date</label>
        <input id="pay_date" type="date" required className={fieldCls}
          value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} htmlFor="pay_method">Method</label>
        <select id="pay_method" className={fieldCls} value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}>
          <option>ACH</option><option>Check</option><option>Wire</option><option>Factoring</option><option>Other</option>
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="pay_ref">Reference</label>
        <input id="pay_ref" className={fieldCls} value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      </div>
      <button type="submit" disabled={pending}
        className="col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Record payment
      </button>
    </form>
  )
}

export function InvoiceActions({
  invoiceId,
  factored,
  disputed,
  factorSubmitted,
  qboPushed,
}: {
  invoiceId: string
  factored: boolean
  disputed: boolean
  factorSubmitted?: boolean
  qboPushed?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      {factored ? (
        <>
          <button
            onClick={() =>
              startTransition(async () => {
                const result = await factoringPacketAction(invoiceId)
                if (result.ok) toast.success(`Packet sent to ${result.id}`)
                else toast.error(result.error ?? "Could not send packet")
              })
            }
            disabled={pending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send factoring packet
          </button>
          {!factorSubmitted ? (
            <button
              onClick={() =>
                startTransition(async () => {
                  const result = await submitInvoiceToFactorAction(invoiceId)
                  if (result.ok) {
                    toast.success(
                      result.alreadySubmitted
                        ? "Already submitted to the factor electronically"
                        : "Submitted to factor electronically"
                    )
                    router.refresh()
                  } else toast.error(result.error ?? "Could not submit to factor")
                })
              }
              disabled={pending}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit to factor
            </button>
          ) : null}
        </>
      ) : null}
      {!qboPushed ? (
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await pushInvoiceToQboAction(invoiceId)
              if (result.ok) {
                toast.success(
                  result.alreadyPushed
                    ? "Already pushed to QuickBooks"
                    : "Invoice pushed to QuickBooks"
                )
                router.refresh()
              } else toast.error(result.error ?? "Could not push to QuickBooks")
            })
          }
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Push to QuickBooks
        </button>
      ) : null}
      {!disputed ? (
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await disputeInvoiceAction(invoiceId)
              if (result.ok) {
                toast.success("Marked disputed — dunning paused")
                router.refresh()
              } else toast.error(result.error ?? "Failed")
            })
          }
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-bad-soft px-4 text-sm font-semibold text-bad hover:bg-bad-soft disabled:opacity-50"
        >
          Mark disputed
        </button>
      ) : null}
    </div>
  )
}

export function DraftSettlementsButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await draftSettlementsAction()
          if (result.ok) {
            toast.success(`${result.created} settlement draft(s) created · ${result.skipped} drivers skipped`)
            router.refresh()
          } else {
            toast.error(result.error ?? "Draft run failed")
          }
        })
      }
      disabled={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Draft this week&apos;s settlements
    </button>
  )
}

export function SettlementActions({ settlementId, status }: { settlementId: string; status: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  if (status === "paid") return null
  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" ? (
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await approveSettlementAction(settlementId)
              if (result.ok) {
                toast.success(result.emailed ? "Approved — statement emailed to the driver" : "Approved — statement PDF ready")
                router.refresh()
              } else toast.error(result.error ?? "Approval failed")
            })
          }
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve &amp; send statement
        </button>
      ) : (
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await markSettlementPaidAction(settlementId)
              if (result.ok) {
                toast.success("Marked paid")
                router.refresh()
              } else toast.error(result.error ?? "Failed")
            })
          }
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-ok-soft bg-ok-soft px-4 text-sm font-bold text-ok hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Mark paid
        </button>
      )}
    </div>
  )
}
