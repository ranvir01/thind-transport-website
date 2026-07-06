/**
 * QuickBooks Online — invoice/payment sync (lane-integrations, creds-shopping-list
 * row 6). Unlike the fuel-card adapters, QBO doesn't need a new table: payments
 * land in the existing hub.payments/hub.invoices tables through the same
 * `recordPayment` path the office UI uses, keyed idempotently on the already-unique
 * `hub.invoices(carrier_id, number)` for matching and a synthetic
 * `reference = "qbo:<Payment.Id>"` for replay-safe dedup (hub.payments has no
 * source/external_id columns — see docs/integrations/qbo.md for why this avoids
 * a migration this cycle).
 *
 * Auth is OAuth2 refresh-token grant (docs.developer.intuit.com): the refresh
 * token exchanges for a short-lived bearer access token on every sync, mirroring
 * telematics.ts's TruckerCloud client-credentials pattern (no caching yet). QBO
 * rotates the refresh token on each use in production, so every successful
 * exchange that returns a *different* refresh_token persists it back to
 * `hub.api_credentials` via `saveCredentials` before the next sync needs it.
 *
 * A QBO Payment links to an Invoice by QBO's internal Id, not our invoice
 * number, so `pull()` does a second query resolving those internal ids to
 * `DocNumber` (which the push side of this integration — not yet built — would
 * set equal to our invoice number when creating the QBO invoice). Until that
 * push side exists, payments for invoices QuickBooks doesn't know under a
 * matching DocNumber come back with `invoiceNumber: null` and are reported as
 * unmatched rather than guessed.
 */
import { getCredentials, hasCredentials, saveCredentials } from "../credentials"
import { queryOne } from "../db"
import { recordPayment } from "../invoices"
import { dollarsToCents } from "../types"
import type { SyncRowBase, SyncSource } from "./registry"

export interface QboPaymentRow extends SyncRowBase {
  invoiceNumber: string | null
  amountCents: number
  paidOn: string
  method: string | null
  raw: Record<string, unknown>
}

/**
 * Pure normalizer — the ONE place the assumed QBO Payment/Invoice response
 * shape is read. `invoiceNumberByTxnId` maps QBO's internal Invoice Id (from
 * the payment's LinkedTxn) to that invoice's DocNumber.
 */
export function normalizeQboPayment(
  payment: Record<string, unknown>,
  invoiceNumberByTxnId: Map<string, string>
): QboPaymentRow {
  const lines = Array.isArray(payment.Line) ? (payment.Line as Record<string, unknown>[]) : []
  const linkedInvoiceTxn = lines
    .flatMap((line) => (Array.isArray(line.LinkedTxn) ? (line.LinkedTxn as Record<string, unknown>[]) : []))
    .find((txn) => txn.TxnType === "Invoice")
  const txnId = linkedInvoiceTxn?.TxnId != null ? String(linkedInvoiceTxn.TxnId) : null

  return {
    external_id: String(payment.Id ?? ""),
    invoiceNumber: txnId ? invoiceNumberByTxnId.get(txnId) ?? null : null,
    amountCents: dollarsToCents(payment.TotalAmt as number | string | undefined),
    paidOn: typeof payment.TxnDate === "string" ? payment.TxnDate : new Date().toISOString().slice(0, 10),
    method: (payment.PaymentRefNum as string) ?? null,
    raw: payment,
  }
}

async function refreshAccessToken(
  creds: Record<string, string>
): Promise<{ accessToken: string; rotatedRefreshToken: string | null }> {
  const authBase = process.env.QBO_OAUTH_BASE ?? "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")
  const response = await fetch(authBase, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: creds.refreshToken }).toString(),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`QuickBooks token → HTTP ${response.status}`)
  const json = (await response.json()) as { access_token?: string; refresh_token?: string }
  if (!json.access_token) throw new Error("QuickBooks token response missing access_token")
  const rotatedRefreshToken =
    json.refresh_token && json.refresh_token !== creds.refreshToken ? json.refresh_token : null
  return { accessToken: json.access_token, rotatedRefreshToken }
}

/**
 * QBO issues a new refresh_token on (most) redemptions and invalidates the
 * old one — a sync that doesn't persist the rotation will work once, then
 * fail the next time with a stale token. Only writes when the token actually
 * changed, so this never fires against providers/creds shapes without OAuth.
 */
async function persistRotatedRefreshToken(
  carrierId: string,
  creds: Record<string, string>,
  rotatedRefreshToken: string | null
): Promise<void> {
  if (!rotatedRefreshToken) return
  await saveCredentials(carrierId, "qbo", { ...creds, refreshToken: rotatedRefreshToken }, "system:qbo")
}

async function qboEntityQuery(
  base: string,
  realmId: string,
  token: string,
  entity: "Payment" | "Invoice",
  sql: string
): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${base}/v3/company/${realmId}/query?query=${encodeURIComponent(sql)}&minorversion=65`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`QuickBooks ${entity} query → HTTP ${response.status}`)
  const json = (await response.json()) as { QueryResponse?: Record<string, unknown> }
  const rows = json.QueryResponse?.[entity]
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
}

/** QBO feed client (docs/integrations/qbo.md — shape unconfirmed until sandbox is wired). */
export function qboSource(carrierId: string): SyncSource<QboPaymentRow> {
  const base = process.env.QBO_API_BASE ?? "https://quickbooks.api.intuit.com"

  return {
    provider: "qbo",
    async connected() {
      return hasCredentials(carrierId, "qbo")
    },
    async pull() {
      const creds = await getCredentials(carrierId, "qbo")
      if (!creds?.clientId || !creds?.clientSecret || !creds?.refreshToken || !creds?.realmId) {
        throw new Error("qbo is not connected")
      }
      const { accessToken, rotatedRefreshToken } = await refreshAccessToken(creds)
      await persistRotatedRefreshToken(carrierId, creds, rotatedRefreshToken)
      const payments = await qboEntityQuery(base, creds.realmId, accessToken, "Payment", "SELECT * FROM Payment MAXRESULTS 100")

      const txnIds = [
        ...new Set(
          payments.flatMap((payment) => {
            const lines = Array.isArray(payment.Line) ? (payment.Line as Record<string, unknown>[]) : []
            return lines
              .flatMap((line) => (Array.isArray(line.LinkedTxn) ? (line.LinkedTxn as Record<string, unknown>[]) : []))
              .filter((txn) => txn.TxnType === "Invoice" && txn.TxnId != null)
              .map((txn) => String(txn.TxnId))
          })
        ),
      ]

      const invoiceNumberByTxnId = new Map<string, string>()
      if (txnIds.length > 0) {
        const idList = txnIds.map((id) => `'${id.replace(/'/g, "")}'`).join(",")
        const invoices = await qboEntityQuery(base, creds.realmId, accessToken, "Invoice", `SELECT Id, DocNumber FROM Invoice WHERE Id IN (${idList})`)
        for (const invoice of invoices) {
          if (invoice.Id != null && invoice.DocNumber != null) {
            invoiceNumberByTxnId.set(String(invoice.Id), String(invoice.DocNumber))
          }
        }
      }

      return payments.map((payment) => normalizeQboPayment(payment, invoiceNumberByTxnId))
    },
  }
}

/**
 * Scheduled/"Sync now" ingest: resolves each QBO payment to a matching
 * hub.invoices row by (carrier_id, number), then reuses `recordPayment` — the
 * SAME function the office "record a payment" form calls — so status
 * transitions, audit logging, and load-status cascades (invoiced → paid →
 * settled) stay in one place. Idempotent replay guard: skip if a payment
 * already exists on that invoice with `reference = "qbo:<Payment.Id>"`.
 */
export async function runQboSync(
  carrierId: string
): Promise<{ connected: boolean; imported?: number; skipped?: number; unmatched?: string[] }> {
  const source = qboSource(carrierId)
  if (!(await source.connected())) return { connected: false }

  const actor = { id: "system:qbo", name: "QuickBooks Online sync" }
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0

  for (const row of await source.pull()) {
    if (!row.external_id) continue
    if (!row.invoiceNumber) {
      unmatched.push(row.external_id)
      continue
    }

    const invoice = await queryOne<{ id: string }>(
      `SELECT id FROM hub.invoices WHERE carrier_id = $1 AND number = $2`,
      [carrierId, row.invoiceNumber]
    )
    if (!invoice) {
      unmatched.push(row.invoiceNumber)
      continue
    }

    const reference = `qbo:${row.external_id}`
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM hub.payments WHERE carrier_id = $1 AND invoice_id = $2 AND reference = $3`,
      [carrierId, invoice.id, reference]
    )
    if (existing) {
      skipped++
      continue
    }

    await recordPayment(
      carrierId,
      invoice.id,
      { amountCents: row.amountCents, paidOn: row.paidOn, method: row.method, reference },
      actor
    )
    imported++
  }

  return { connected: true, imported, skipped, unmatched: [...new Set(unmatched)] }
}
