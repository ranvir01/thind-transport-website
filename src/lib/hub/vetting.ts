/**
 * Broker vetting (M4/Phase 5): FMCSA QCMobile lookups (free webkey) plus the
 * carrier's own receivables history — credit intelligence no subscription
 * can beat. Guards against the double-brokering fraud wave.
 */
import { query, queryOne } from "./db"

export interface VettingSnapshot {
  id: string
  customer_id: string
  allowed_to_operate: boolean | null
  authority_status: string | null
  legal_name: string | null
  risk_score: number | null
  risk_reasons: string[]
  checked_at: string
}

export function fmcsaConfigured(): boolean {
  return Boolean(process.env.FMCSA_WEBKEY)
}

export { computeRiskScore, DOUBLE_BROKER_CHECKLIST } from "./vetting-shared"
import { computeRiskScore } from "./vetting-shared"
import {
  carrierAllowedToOperate,
  carrierAuthorityStatus,
  extractQcCarrier,
  type QcCarrier,
} from "./vetting-fmcsa"

/** QCMobile lookup by MC (docket) or DOT number. Returns null when not configured. */
async function fmcsaLookup(customer: {
  mc_number: string | null
  dot_number: string | null
}): Promise<{ carrier: QcCarrier; raw: unknown } | null> {
  const webKey = process.env.FMCSA_WEBKEY
  if (!webKey) return null
  const base = "https://mobile.fmcsa.dot.gov/qc/services/carriers"
  const urls: string[] = []
  if (customer.mc_number) urls.push(`${base}/docket-number/${encodeURIComponent(customer.mc_number)}?webKey=${webKey}`)
  if (customer.dot_number) urls.push(`${base}/${encodeURIComponent(customer.dot_number)}?webKey=${webKey}`)
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) continue
      const json = await response.json()
      const carrier = extractQcCarrier(json)
      if (carrier) return { carrier, raw: json }
    } catch {
      /* try the next identifier */
    }
  }
  return null
}

/** Run a vetting check now: FMCSA (when configured) + own payment history. */
export async function vetCustomer(carrierId: string, customerId: string): Promise<VettingSnapshot | null> {
  const customer = await queryOne<{
    id: string; name: string; mc_number: string | null; dot_number: string | null
    payment_terms_days: number
  }>(
    `SELECT id, name, mc_number, dot_number, payment_terms_days FROM hub.customers
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, customerId]
  )
  if (!customer) return null

  const lookup = await fmcsaLookup(customer)
  const paySpeed = await avgDaysToPay(carrierId, customerId)

  const allowed = lookup ? carrierAllowedToOperate(lookup.carrier) : null
  const authorityStatus = lookup ? carrierAuthorityStatus(lookup.carrier) : null
  const nameMatches = lookup?.carrier.legalName
    ? normalizeName(lookup.carrier.legalName) === normalizeName(customer.name) ||
      normalizeName(lookup.carrier.dbaName ?? "") === normalizeName(customer.name)
    : null

  const { score, reasons } = computeRiskScore({
    allowedToOperate: allowed,
    authorityStatus,
    nameMatches,
    avgDaysToPay: paySpeed.avgDays,
    paymentTermsDays: customer.payment_terms_days,
  })

  const rows = await query<VettingSnapshot>(
    `INSERT INTO hub.customer_vetting (carrier_id, customer_id, allowed_to_operate, authority_status,
       legal_name, snapshot, risk_score, risk_reasons)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      carrierId, customerId, allowed, authorityStatus,
      lookup?.carrier.legalName ?? null,
      lookup ? JSON.stringify(lookup.raw) : null,
      score, JSON.stringify(reasons),
    ]
  )
  return rows[0]
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(llc|inc|corp|co|ltd)$/g, "")
}

export async function latestVetting(carrierId: string, customerId: string): Promise<VettingSnapshot | null> {
  return queryOne<VettingSnapshot>(
    `SELECT * FROM hub.customer_vetting WHERE carrier_id = $1 AND customer_id = $2
     ORDER BY checked_at DESC LIMIT 1`,
    [carrierId, customerId]
  )
}

/**
 * Nightly re-check of every active customer (cron): alert the office when an
 * authority goes inactive between bookings.
 */
export async function recheckActiveCustomers(carrierId: string): Promise<{ checked: number; alerts: number }> {
  if (!fmcsaConfigured()) return { checked: 0, alerts: 0 }
  const customers = await query<{ id: string; name: string }>(
    `SELECT id, name FROM hub.customers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'
       AND (mc_number IS NOT NULL OR dot_number IS NOT NULL) LIMIT 50`,
    [carrierId]
  )
  let alerts = 0
  for (const customer of customers) {
    const previous = await latestVetting(carrierId, customer.id)
    const current = await vetCustomer(carrierId, customer.id)
    if (
      current &&
      previous?.allowed_to_operate === true &&
      current.allowed_to_operate === false
    ) {
      alerts++
      const { notifyRoles } = await import("./notify")
      await notifyRoles(carrierId, ["owner", "dispatcher"], {
        kind: "vetting",
        title: `⚠ ${customer.name} lost operating authority`,
        body: "FMCSA now shows them not allowed to operate. Don't book the next load.",
        link: `/hub/customers/${customer.id}`,
      })
    }
  }
  return { checked: customers.length, alerts }
}

// ---- Payment-speed intelligence (own AR history — free credit data) ----

export interface PaymentSpeed {
  avgDays: number | null
  samples: number
  /** positive = getting slower, negative = getting faster (days). */
  trend: number | null
  slowPayer: boolean
}

export async function avgDaysToPay(carrierId: string, customerId: string): Promise<PaymentSpeed> {
  const rows = await query<{ days: string; paid_on: string }>(
    `SELECT EXTRACT(DAY FROM p.paid_on::timestamp - i.issued_on::timestamp)::numeric AS days, p.paid_on
     FROM hub.payments p JOIN hub.invoices i ON i.id = p.invoice_id AND i.carrier_id = p.carrier_id
     WHERE i.carrier_id = $1 AND i.customer_id = $2
     ORDER BY p.paid_on DESC LIMIT 24`,
    [carrierId, customerId]
  )
  if (rows.length === 0) return { avgDays: null, samples: 0, trend: null, slowPayer: false }
  const days = rows.map((r) => Number(r.days))
  const avg = days.reduce((s, d) => s + d, 0) / days.length
  let trend: number | null = null
  if (days.length >= 6) {
    const recent = days.slice(0, 3).reduce((s, d) => s + d, 0) / 3
    const prior = days.slice(3, 6).reduce((s, d) => s + d, 0) / 3
    trend = Math.round((recent - prior) * 10) / 10
  }
  const customer = await queryOne<{ payment_terms_days: number }>(
    `SELECT payment_terms_days FROM hub.customers WHERE carrier_id = $1 AND id = $2`,
    [carrierId, customerId]
  )
  const terms = customer?.payment_terms_days ?? 30
  return {
    avgDays: Math.round(avg * 10) / 10,
    samples: days.length,
    trend,
    slowPayer: avg > terms + 15,
  }
}

/** Open AR + credit limit exposure for booking-time warnings. */
export async function creditExposure(
  carrierId: string,
  customerId: string
): Promise<{ openCents: number; creditLimitCents: number | null; overLimit: boolean }> {
  const row = await queryOne<{ open_cents: string; credit_limit_cents: number | null }>(
    `SELECT
       COALESCE((SELECT SUM(i.amount_cents - COALESCE(p.paid, 0))
         FROM hub.invoices i
         LEFT JOIN LATERAL (SELECT SUM(amount_cents) AS paid FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id) p ON TRUE
         WHERE i.carrier_id = $1 AND i.customer_id = $2 AND i.status NOT IN ('paid','disputed')), 0) AS open_cents,
       (SELECT credit_limit_cents FROM hub.customers WHERE carrier_id = $1 AND id = $2) AS credit_limit_cents`,
    [carrierId, customerId]
  )
  const openCents = Number(row?.open_cents ?? 0)
  const creditLimitCents = row?.credit_limit_cents ?? null
  return {
    openCents,
    creditLimitCents,
    overLimit: creditLimitCents != null && openCents > creditLimitCents,
  }
}
