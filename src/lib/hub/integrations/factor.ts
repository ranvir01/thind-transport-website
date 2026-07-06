/**
 * Factoring company API (lane-integrations, creds-shopping-list row 7 — the
 * last provider in the fuel/telematics/accounting set). Unlike the poll-based
 * fuel and telematics adapters, a factor relationship is two independent
 * half-adapters instead of one `SyncSource<Row>`:
 *
 *  - PUSH out: `submitInvoiceToFactor` electronically submits an invoice for
 *    purchase instead of `sendFactoringPacket`'s email attachment
 *    (invoices.ts) — that email path stays the fallback until credentials
 *    exist, exactly like the CSV fallback on the poll adapters.
 *  - PUSH in: the factor calls back through the generic, already-shipped
 *    `/api/hub/webhooks/factor?carrier=<uuid>` receiver
 *    (src/app/api/hub/webhooks/[provider]/route.ts), which now applies
 *    `processFactorEvent` to every verified event right after storing it.
 *
 * Real vendor shape is unconfirmed (see docs/integrations/factor.md) — this
 * targets the common factoring-API pattern (submit a reference number +
 * amount + document refs, get `invoice.funded`-style webhooks keyed by that
 * same reference number back).
 */
import { logAudit } from "../audit"
import { getCredentials, hasCredentials } from "../credentials"
import { query, queryOne } from "../db"
import { listDocuments } from "../documents"
import { getInvoice, recordPayment } from "../invoices"
import { dollarsToCents } from "../types"

export interface FactorEvent {
  external_id: string
  kind: string | null
  payload: Record<string, unknown>
}

export interface FactorEventOutcome {
  applied: boolean
  invoiceNumber: string | null
  reason?: string
}

/** Event kinds this adapter knows how to turn into a recorded payment. */
const FUNDING_EVENT_KINDS = new Set(["invoice.funded", "advance.paid", "invoice.purchased"])

/** Pure — the one place the assumed factor webhook payload shape is read. */
export function normalizeFactorEvent(payload: Record<string, unknown>): {
  invoiceNumber: string | null
  amountCents: number | null
  paidOn: string
} {
  const invoiceNumber =
    (payload.invoiceNumber as string | undefined) ??
    (payload.referenceNumber as string | undefined) ??
    (payload.clientReference as string | undefined) ??
    null
  const amount = (payload.amount ?? payload.advanceAmount ?? payload.netAmount) as
    | number
    | string
    | undefined
  return {
    invoiceNumber: invoiceNumber ? String(invoiceNumber) : null,
    amountCents: amount != null ? dollarsToCents(amount) : null,
    paidOn:
      typeof payload.fundedAt === "string" ? payload.fundedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  }
}

/**
 * Applies one verified inbound event to hub.invoices/hub.payments. Idempotent
 * on `reference = "factor:<external_id>"` (hub.payments has no
 * source/external_id/unique key of its own — same migration-free dedup route
 * qbo.ts uses) — safe to call more than once for the same event, including a
 * manual re-drain of an event a first pass couldn't apply. Only funding-style
 * events record a payment; every other kind (e.g. `invoice.rejected`) or an
 * unmatched/incomplete payload is reported back rather than guessed.
 */
export async function processFactorEvent(
  carrierId: string,
  event: FactorEvent,
  actor: { id: string; name: string } = { id: "system:factor", name: "Factoring webhook" }
): Promise<FactorEventOutcome> {
  if (!event.kind || !FUNDING_EVENT_KINDS.has(event.kind)) {
    return { applied: false, invoiceNumber: null, reason: `unhandled event kind: ${event.kind ?? "none"}` }
  }

  const { invoiceNumber, amountCents, paidOn } = normalizeFactorEvent(event.payload)
  if (!invoiceNumber || !amountCents || amountCents <= 0) {
    return { applied: false, invoiceNumber, reason: "missing invoice reference or amount" }
  }

  const invoice = await queryOne<{ id: string }>(
    `SELECT id FROM hub.invoices WHERE carrier_id = $1 AND number = $2`,
    [carrierId, invoiceNumber]
  )
  if (!invoice) return { applied: false, invoiceNumber, reason: "no matching invoice" }

  const reference = `factor:${event.external_id}`
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM hub.payments WHERE carrier_id = $1 AND invoice_id = $2 AND reference = $3`,
    [carrierId, invoice.id, reference]
  )
  if (existing) return { applied: false, invoiceNumber, reason: "already recorded" }

  await recordPayment(carrierId, invoice.id, { amountCents, paidOn, method: "factor-advance", reference }, actor)
  return { applied: true, invoiceNumber }
}

/**
 * Push side: submit an invoice for purchase — reference number, amount, and
 * rate-con/POD document refs. Guards against a double submission the same
 * way `sendFactoringPacket` guards double emails: an entry already present in
 * `hub.invoices.sent_log`. Reuses that column rather than adding a new one
 * (same migration-free approach as `qbo.ts`'s payment dedup via `reference`).
 */
export async function submitInvoiceToFactor(
  carrierId: string,
  invoiceId: string,
  actor: { id: string; name: string }
): Promise<{ connected: boolean; submitted?: boolean; alreadySubmitted?: boolean }> {
  if (!(await hasCredentials(carrierId, "factor"))) return { connected: false }
  const creds = await getCredentials(carrierId, "factor")
  if (!creds?.apiKey) return { connected: false }

  const invoice = await getInvoice(carrierId, invoiceId)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.sent_log?.some((entry) => entry.kind === "factor-submission")) {
    return { connected: true, alreadySubmitted: true }
  }

  const docs = await listDocuments(carrierId, "load", invoice.load_id)
  const base = process.env.FACTOR_API_BASE ?? "https://api.factor-partner.example.com/v1"
  const response = await fetch(`${base}/invoices`, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      referenceNumber: invoice.number,
      amount: invoice.amount_cents / 100,
      debtorName: invoice.customer_name,
      documents: docs
        .filter((d) => d.kind === "rate_confirmation" || d.kind === "pod")
        .map((d) => ({ kind: d.kind, url: d.url })),
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Factor submission → HTTP ${response.status}`)

  await query(
    `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1 AND carrier_id = $3`,
    [invoice.id, JSON.stringify([{ to: "factor-api", at: new Date().toISOString(), kind: "factor-submission" }]), carrierId]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoiceId, action: "factor-submission",
    newValue: { number: invoice.number },
  })
  return { connected: true, submitted: true }
}
