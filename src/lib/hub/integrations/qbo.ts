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
import { logAudit } from "../audit"
import { getCredentials, hasCredentials, saveCredentials } from "../credentials"
import { query, queryOne } from "../db"
import { getInvoice, recordPayment } from "../invoices"
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

interface TokenRotation {
  accessToken: string
  rotatedRefreshToken: string | null
  /** Absolute ISO expiry of the refresh token itself (Intuit's 5-year hard cap), null when the response omits it. */
  refreshTokenExpiresAt: string | null
}

async function refreshAccessToken(creds: Record<string, string>): Promise<TokenRotation> {
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
  const json = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    x_refresh_token_expires_in?: number
  }
  if (!json.access_token) throw new Error("QuickBooks token response missing access_token")
  const rotatedRefreshToken =
    json.refresh_token && json.refresh_token !== creds.refreshToken ? json.refresh_token : null
  const expiresInSeconds =
    typeof json.x_refresh_token_expires_in === "number" && Number.isFinite(json.x_refresh_token_expires_in) && json.x_refresh_token_expires_in > 0
      ? json.x_refresh_token_expires_in
      : null
  const refreshTokenExpiresAt =
    expiresInSeconds != null ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null
  return { accessToken: json.access_token, rotatedRefreshToken, refreshTokenExpiresAt }
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * QBO issues a new refresh_token on (most) redemptions and invalidates the
 * old one — a sync that doesn't persist the rotation will work once, then
 * fail the next time with a stale token. The refresh-token's own absolute
 * expiry (Intuit's 5-year hard cap) rides along in the same payload so the
 * settings card can warn before the token dies unrecoverably. Only writes
 * when the token actually changed or the expiry drifted by more than a day —
 * the expiry recomputes from now + x_refresh_token_expires_in on every
 * redemption, so a tighter guard would rewrite credentials every sync.
 */
async function persistTokenRotation(
  carrierId: string,
  creds: Record<string, string>,
  rotation: TokenRotation
): Promise<void> {
  const storedExpiry = creds.refreshTokenExpiresAt ? Date.parse(creds.refreshTokenExpiresAt) : NaN
  const expiryDrifted =
    rotation.refreshTokenExpiresAt != null &&
    (Number.isNaN(storedExpiry) || Math.abs(Date.parse(rotation.refreshTokenExpiresAt) - storedExpiry) > DAY_MS)
  if (!rotation.rotatedRefreshToken && !expiryDrifted) return
  // null, not a "system:qbo" sentinel — created_by is a UUID column, and a
  // non-UUID string makes the INSERT throw, crashing every sync that rotates.
  await saveCredentials(
    carrierId,
    "qbo",
    {
      ...creds,
      refreshToken: rotation.rotatedRefreshToken ?? creds.refreshToken,
      // Keep the stored expiry when the response omits the field — the 5-year
      // cap counts from the original authorization, so it survives rotations.
      ...(rotation.refreshTokenExpiresAt ? { refreshTokenExpiresAt: rotation.refreshTokenExpiresAt } : {}),
    },
    null
  )
}

/**
 * Settings-card notice for the refresh token's hard expiry (null when the
 * carrier isn't connected or no expiry has been observed yet — it lands on
 * the first sync after this shipped). Warns inside 90 days: past that point
 * the only fix is the owner repeating the manual auth-code exchange, so the
 * card must say so before the sync dies, not after.
 */
export function qboTokenExpiryNotice(
  creds: Record<string, string> | null,
  now: Date = new Date()
): { text: string; warn: boolean } | null {
  const expiryMs = creds?.refreshTokenExpiresAt ? Date.parse(creds.refreshTokenExpiresAt) : NaN
  if (Number.isNaN(expiryMs)) return null
  const date = new Date(expiryMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const daysLeft = (expiryMs - now.getTime()) / DAY_MS
  if (daysLeft < 0) {
    return { text: `QuickBooks refresh token expired ${date} — paste a fresh refresh token (Edit) to restart the sync.`, warn: true }
  }
  if (daysLeft <= 90) {
    return { text: `QuickBooks refresh token expires ${date} (Intuit's 5-year cap) — paste a fresh refresh token before then or the sync stops.`, warn: true }
  }
  return { text: `Refresh token valid until ${date} — Intuit's 5-year cap; reconnecting resets it.`, warn: false }
}

async function qboEntityQuery(
  base: string,
  realmId: string,
  token: string,
  entity: "Payment" | "Invoice" | "Customer" | "Item",
  sql: string
): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${base}/v3/company/${realmId}/query?query=${encodeURIComponent(sql)}&minorversion=75`, {
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
      const rotation = await refreshAccessToken(creds)
      await persistTokenRotation(carrierId, creds, rotation)
      const accessToken = rotation.accessToken
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

  // Null id per the system-actor convention (see processFactorEvent) — actor_id
  // columns are UUIDs, and recordPayment's null-tolerant sinks type narrower
  // than they accept.
  const actor = { id: null, name: "QuickBooks Online sync" } as unknown as { id: string; name: string }
  const unmatched: string[] = []
  let imported = 0
  let skipped = 0

  for (const row of await source.pull()) {
    if (!row.external_id) continue
    if (!row.invoiceNumber) {
      unmatched.push(row.external_id)
      continue
    }
    // A missing/garbled TotalAmt normalizes to 0 cents (dollarsToCents), and a
    // refund-shaped payload can go negative — recording either would land a
    // junk hub.payments row and rewrite the invoice's status off it (an unpaid
    // invoice flips to 'partial', a paid one can downgrade). Refuse and report,
    // the same way processFactorEvent refuses an incomplete funding payload.
    if (!Number.isInteger(row.amountCents) || row.amountCents <= 0) {
      unmatched.push(row.invoiceNumber)
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

/**
 * Resolves a QBO entity (Customer or Item) by exact `DisplayName` match,
 * creating one if none exists. QuickBooks references everything by its own
 * internal Id, not our carrier-scoped ones, and `hub.customers` has no QBO-id
 * column to store a mapping in (adding one is a migration — a shared-file
 * change outside this lane, same story as `docs/integrations/qbo.md`'s
 * payments note) — so this resolves by name every push instead, exactly like
 * `pull()` resolves invoices by `DocNumber` rather than a stored id.
 */
/**
 * Looks up a previously-pushed QBO invoice by the DocNumber we set on
 * create (same DocNumber-matching approach `pull()` uses for payments).
 * Returns the current `TotalAmt` alongside `Id`/`SyncToken` so
 * `pushInvoiceToQbo` can tell whether a rate/accessorial edit since the
 * original push needs a sparse update sent, or whether it's a no-op.
 */
async function findQboInvoiceRef(
  base: string,
  realmId: string,
  token: string,
  docNumber: string
): Promise<{ id: string; syncToken: string; totalAmtCents: number } | null> {
  const escaped = docNumber.replace(/'/g, "")
  const matches = await qboEntityQuery(base, realmId, token, "Invoice", `SELECT Id, SyncToken, TotalAmt FROM Invoice WHERE DocNumber = '${escaped}'`)
  const match = matches[0]
  if (match?.Id == null) return null
  return {
    id: String(match.Id),
    syncToken: String(match.SyncToken ?? "0"),
    totalAmtCents: dollarsToCents(match.TotalAmt as number | string | undefined),
  }
}

async function resolveQboRef(
  base: string,
  realmId: string,
  token: string,
  entity: "Customer" | "Item",
  displayName: string,
  createBody: Record<string, unknown>
): Promise<string> {
  const escaped = displayName.replace(/'/g, "")
  const matches = await qboEntityQuery(base, realmId, token, entity, `SELECT Id FROM ${entity} WHERE DisplayName = '${escaped}'`)
  if (matches[0]?.Id != null) return String(matches[0].Id)

  const response = await fetch(`${base}/v3/company/${realmId}/${entity.toLowerCase()}?minorversion=75`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(createBody),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`QuickBooks ${entity} create → HTTP ${response.status}`)
  const json = (await response.json()) as Record<string, Record<string, unknown> | undefined>
  const created = json[entity]
  if (!created?.Id) throw new Error(`QuickBooks ${entity} create response missing Id`)
  return String(created.Id)
}

/**
 * Push side: create a QBO Invoice with `DocNumber` set to our invoice
 * number — closing the loop `qboSource`'s docstring describes (a payment
 * only resolves to one of our invoices once a QBO Invoice exists under that
 * DocNumber). A second push for the same invoice doesn't just short-circuit:
 * it looks the QBO invoice back up by DocNumber (`findQboInvoiceRef`) and
 * compares `TotalAmt` against our current `amount_cents` — unchanged means a
 * true no-op (`alreadyPushed`), but a rate/accessorial edit since the
 * original push sends a sparse update (`operation=update` with the looked-up
 * `Id`/`SyncToken`) instead of silently drifting out of sync with QBO.
 *
 * The Customer and line-item Item are resolved by name (see `resolveQboRef`)
 * rather than a per-accessorial breakdown — a single flat line against a
 * generic "Freight Service" Item is the assumed shape until whoever wires the
 * office "Push to QBO" button (this lane's territory doesn't include the
 * invoice detail page) decides whether accessorials need their own lines.
 */
export async function pushInvoiceToQbo(
  carrierId: string,
  invoiceId: string,
  actor: { id: string; name: string }
): Promise<{ connected: boolean; pushed?: boolean; alreadyPushed?: boolean; updated?: boolean }> {
  if (!(await hasCredentials(carrierId, "qbo"))) return { connected: false }
  const creds = await getCredentials(carrierId, "qbo")
  if (!creds?.clientId || !creds?.clientSecret || !creds?.refreshToken || !creds?.realmId) return { connected: false }

  const invoice = await getInvoice(carrierId, invoiceId)
  if (!invoice) throw new Error("Invoice not found")

  const rotation = await refreshAccessToken(creds)
  await persistTokenRotation(carrierId, creds, rotation)
  const accessToken = rotation.accessToken
  const base = process.env.QBO_API_BASE ?? "https://quickbooks.api.intuit.com"

  const previouslyPushed = invoice.sent_log?.some((entry) => entry.kind === "qbo-push" || entry.kind === "qbo-push-update")
  if (previouslyPushed) {
    const existing = await findQboInvoiceRef(base, creds.realmId, accessToken, invoice.number)
    if (!existing || existing.totalAmtCents === invoice.amount_cents) {
      return { connected: true, alreadyPushed: true }
    }

    const itemId = await resolveQboRef(base, creds.realmId, accessToken, "Item", "Freight Service", {
      Name: "Freight Service", Type: "Service", IncomeAccountRef: { value: "1" },
    })
    const response = await fetch(`${base}/v3/company/${creds.realmId}/invoice?operation=update&minorversion=75`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Id: existing.id,
        SyncToken: existing.syncToken,
        sparse: true,
        Line: [
          {
            Amount: invoice.amount_cents / 100,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: { ItemRef: { value: itemId } },
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`QuickBooks invoice update → HTTP ${response.status}`)

    await query(
      `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1 AND carrier_id = $3`,
      [invoice.id, JSON.stringify([{ to: "qbo", at: new Date().toISOString(), kind: "qbo-push-update" }]), carrierId]
    )
    await logAudit({
      carrierId, actorId: actor.id, actorName: actor.name,
      entityType: "invoice", entityId: invoiceId, action: "qbo-push-update",
      newValue: { number: invoice.number, amountCents: invoice.amount_cents },
    })
    return { connected: true, pushed: true, updated: true }
  }

  const customerName = invoice.customer_name ?? "Unknown customer"
  const customerId = await resolveQboRef(base, creds.realmId, accessToken, "Customer", customerName, {
    DisplayName: customerName,
  })
  const itemId = await resolveQboRef(base, creds.realmId, accessToken, "Item", "Freight Service", {
    Name: "Freight Service", Type: "Service", IncomeAccountRef: { value: "1" },
  })

  const response = await fetch(`${base}/v3/company/${creds.realmId}/invoice?minorversion=75`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      DocNumber: invoice.number,
      CustomerRef: { value: customerId },
      Line: [
        {
          Amount: invoice.amount_cents / 100,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: { ItemRef: { value: itemId } },
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`QuickBooks invoice push → HTTP ${response.status}`)

  await query(
    `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1 AND carrier_id = $3`,
    [invoice.id, JSON.stringify([{ to: "qbo", at: new Date().toISOString(), kind: "qbo-push" }]), carrierId]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoiceId, action: "qbo-push",
    newValue: { number: invoice.number },
  })
  return { connected: true, pushed: true }
}
