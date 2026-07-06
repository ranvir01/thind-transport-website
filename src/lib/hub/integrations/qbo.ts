/**
 * QuickBooks Online — read/reconcile slice (lane-integrations, next per
 * creds-shopping-list.md after EFS/TruckerCloud/WEX/Comdata). Unlike the
 * fuel-card adapters, QBO invoices don't land in a fresh idempotent table —
 * they reconcile against LoadOff's OWN invoices (hub.invoices, matched by
 * `number` == QBO's `DocNumber`) through the existing `recordPayment()` used
 * by the manual payment-recording UI, so a QBO-confirmed payment cascades
 * through the normal invoiced → paid → settled pipeline exactly like a
 * manually-entered one. See docs/integrations/qbo.md for the auth model,
 * assumed Query API shape, and open questions (refresh-token persistence,
 * paging) before flipping status to live.
 */
import { getCredentials, hasCredentials } from "../credentials"
import { query } from "../db"
import { dollarsToCents } from "../types"
import { recordPayment } from "../invoices"
import type { SyncRowBase, SyncSource } from "./registry"

export interface QboInvoiceRow extends SyncRowBase {
  docNumber: string
  totalCents: number
  balanceCents: number
  txnDate: string
}

/** System actor for audit/payment rows recorded by an automated sync, not a human click. */
const QBO_SYNC_ACTOR = { id: "00000000-0000-0000-0000-000000000000", name: "QuickBooks sync" }

/**
 * Pure normalizer — the one place QBO's assumed Invoice shape is read
 * (docs/integrations/qbo.md). Unit tested in __tests__/qbo.test.ts without
 * a live sandbox.
 */
export function normalizeQboInvoice(record: Record<string, unknown>): QboInvoiceRow {
  return {
    external_id: String(record.Id ?? ""),
    docNumber: String(record.DocNumber ?? ""),
    totalCents: dollarsToCents(record.TotalAmt as number | string | undefined),
    balanceCents: dollarsToCents(record.Balance as number | string | undefined),
    txnDate: typeof record.TxnDate === "string" && record.TxnDate ? record.TxnDate : new Date().toISOString().slice(0, 10),
  }
}

/**
 * Pure reconciliation decision — given a QBO invoice row and how much
 * LoadOff already has recorded against the matching invoice, decides
 * whether a new payment needs recording and by how much. Delta-based so
 * replays are idempotent without a DB uniqueness constraint: recording the
 * delta brings LoadOff's total in line with QBO's, so the next sync
 * computes delta 0 and does nothing.
 */
export function reconcileQboInvoice(
  row: QboInvoiceRow,
  alreadyPaidCents: number
): { newlyPaidCents: number; reference: string } | null {
  const paidSoFarInQbo = row.totalCents - row.balanceCents
  const newlyPaidCents = paidSoFarInQbo - alreadyPaidCents
  if (newlyPaidCents <= 0) return null
  return { newlyPaidCents, reference: `qbo:${row.external_id}:${paidSoFarInQbo}` }
}

async function fetchAccessToken(creds: Record<string, string>): Promise<string> {
  const authBase = process.env.QBO_OAUTH_BASE ?? "https://oauth.platform.intuit.com/oauth2/v1"
  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")
  const response = await fetch(`${authBase}/tokens/bearer`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: creds.refreshToken }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`QBO token refresh → HTTP ${response.status}`)
  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) throw new Error("QBO token refresh returned no access_token")
  return json.access_token
}

/** QBO client (docs/integrations/qbo.md — shape unconfirmed until a real sandbox responds). */
export function qboSource(carrierId: string): SyncSource<QboInvoiceRow> {
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
      const accessToken = await fetchAccessToken(creds)
      const sql = "select Id, DocNumber, TotalAmt, Balance, TxnDate from Invoice maxresults 200"
      const response = await fetch(
        `${base}/v3/company/${creds.realmId}/query?query=${encodeURIComponent(sql)}&minorversion=65`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000) }
      )
      if (!response.ok) throw new Error(`QBO query → HTTP ${response.status}`)
      const json = (await response.json()) as { QueryResponse?: { Invoice?: unknown[] } }
      return ((json.QueryResponse?.Invoice ?? []) as Record<string, unknown>[]).map(normalizeQboInvoice)
    },
  }
}

/**
 * "Sync now" reconciliation: for every QBO invoice matching an unpaid/partial
 * LoadOff invoice by number, records the newly-paid delta through the SAME
 * recordPayment() the manual payment UI uses — so a QBO-confirmed payment
 * cascades through invoiced → paid → settled exactly like a human-entered
 * one. Unmatched DocNumbers are reported, never guessed (mirrors
 * runEfsSync's unit-hint handling).
 */
export async function runQboSync(
  carrierId: string
): Promise<{ connected: boolean; matched?: number; recorded?: number; unmatched?: string[] }> {
  const source = qboSource(carrierId)
  if (!(await source.connected())) return { connected: false }

  const invoices = await query<{ id: string; number: string }>(
    `SELECT id, number FROM hub.invoices WHERE carrier_id = $1 AND status != 'paid'`,
    [carrierId]
  )
  const byNumber = new Map(invoices.map((inv) => [inv.number.trim().toLowerCase(), inv]))
  const unmatched: string[] = []
  let matched = 0
  let recorded = 0

  for (const row of await source.pull()) {
    if (!row.docNumber) continue
    const invoice = byNumber.get(row.docNumber.trim().toLowerCase())
    if (!invoice) {
      unmatched.push(row.docNumber)
      continue
    }
    matched++

    const [{ paid }] = await query<{ paid: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::int AS paid FROM hub.payments WHERE carrier_id = $1 AND invoice_id = $2`,
      [carrierId, invoice.id]
    )
    const decision = reconcileQboInvoice(row, paid)
    if (!decision) continue

    await recordPayment(
      carrierId,
      invoice.id,
      { amountCents: decision.newlyPaidCents, paidOn: row.txnDate, method: "QuickBooks", reference: decision.reference },
      QBO_SYNC_ACTOR
    )
    recorded++
  }

  return { connected: true, matched, recorded, unmatched: [...new Set(unmatched)] }
}
