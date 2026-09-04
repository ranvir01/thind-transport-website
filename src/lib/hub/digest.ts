/**
 * Weekly owner digest (Phase 6 §9): the Monday-morning numbers —
 * everything real, nothing fabricated, links straight into the Hub.
 *
 * In-app FIRST, email second, same contract as runComplianceAlerts: production
 * SMTP has twice sat on a rejected Gmail app password for a week at a time
 * (535-5.7.8, 2026-08-07→08-13 and again 08-28→09-03). The Monday numbers used
 * to die with the failed send. A notification row costs one INSERT and
 * survives SMTP. The mail failure still throws so /api/hub/cron/health and the
 * Vercel cron dashboard keep showing the broken credential.
 */
import { appPublicOrigin } from "@/lib/app-origin"
import { query, queryOne } from "./db"
import { notifyRoles } from "./notify"
import { getCarrier, getCarrierSettings } from "./settings"

export type OwnerDigestRun = {
  /** True only when the email actually left — existing callers/tests key on this. */
  sent: boolean
  notified: boolean
  emailed: boolean
  reason?: "no_stats" | "no_office_email" | "not_configured"
}

export async function sendOwnerDigest(carrierId: string): Promise<OwnerDigestRun> {
  const [carrier, settings] = await Promise.all([
    getCarrier(carrierId),
    getCarrierSettings(carrierId),
  ])

  const stats = await queryOne<{
    revenue_week: string; delivered_week: string; unbilled: string
    ar_open: string; ar_overdue: string; settlements_draft: string
    red_compliance_drivers: string; red_compliance_equipment: string; empty_trucks: string
  }>(
    `SELECT
       COALESCE((SELECT SUM(linehaul_cents + fuel_surcharge_cents) FROM hub.loads
         WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'
           AND created_at >= NOW() - INTERVAL '7 days'), 0) AS revenue_week,
       (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL
          AND status IN ('delivered','pod_received','invoiced','paid','settled')
          AND updated_at >= NOW() - INTERVAL '7 days') AS delivered_week,
       (SELECT COUNT(*) FROM hub.loads l WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
          AND l.status = 'pod_received'
          AND NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id)) AS unbilled,
       COALESCE((SELECT SUM(i.amount_cents - COALESCE(p.paid, 0)) FROM hub.invoices i
         LEFT JOIN LATERAL (SELECT SUM(amount_cents) AS paid FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id) p ON TRUE
         WHERE i.carrier_id = $1 AND i.status NOT IN ('paid','disputed')), 0) AS ar_open,
       (SELECT COUNT(*) FROM hub.invoices WHERE carrier_id = $1 AND status = 'overdue') AS ar_overdue,
       (SELECT COUNT(*) FROM hub.settlements WHERE carrier_id = $1 AND status = 'draft') AS settlements_draft,
       (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'
          AND (cdl_expiry < CURRENT_DATE OR medical_card_expiry < CURRENT_DATE)) AS red_compliance_drivers,
       -- Equipment out of compliance is as grounding as a lapsed med card (an
       -- expired truck insurance/registration is an out-of-service violation),
       -- so the Monday email must not report "all clear" while a unit is red.
       -- Mirrors complianceEntries' predicate: non-retired, non-deleted, and a
       -- NULL expiry is "not on file" (amber), not expired, so it is not counted.
       ((SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'
           AND (registration_expiry < CURRENT_DATE OR inspection_due < CURRENT_DATE OR insurance_expiry < CURRENT_DATE))
        + (SELECT COUNT(*) FROM hub.trailers WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'
           AND (registration_expiry < CURRENT_DATE OR inspection_due < CURRENT_DATE))) AS red_compliance_equipment,
       (SELECT COUNT(*) FROM hub.trucks t WHERE t.carrier_id = $1 AND t.deleted_at IS NULL AND t.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM hub.loads l WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL
            AND l.status IN ('booked','dispatched','at_pickup','in_transit'))) AS empty_trucks`,
    [carrierId]
  )
  if (!stats) return { sent: false, notified: false, emailed: false, reason: "no_stats" }

  const dollars = (cents: string) => `$${(Number(cents) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  const redDrivers = Number(stats.red_compliance_drivers)
  const redEquipment = Number(stats.red_compliance_equipment)
  const complianceParts = [
    redDrivers > 0 ? `${redDrivers} driver(s) with an EXPIRED CDL or med card` : null,
    redEquipment > 0
      ? `${redEquipment} truck/trailer(s) with EXPIRED registration, inspection, or insurance`
      : null,
  ].filter(Boolean)
  const lines = [
    `Booked this week: ${dollars(stats.revenue_week)}  ·  ${stats.delivered_week} load(s) delivered`,
    `Owed to you: ${dollars(stats.ar_open)} open AR${Number(stats.ar_overdue) > 0 ? ` (${stats.ar_overdue} overdue!)` : ""}`,
    `Unbilled PODs: ${stats.unbilled} — every one is money sitting on the floor`,
    `Settlements waiting on approval: ${stats.settlements_draft}`,
    `Trucks empty right now: ${stats.empty_trucks}`,
    complianceParts.length > 0
      ? `⚠ ${complianceParts.join("  ·  ")}`
      : `Compliance: no expired driver or equipment documents`,
  ]

  const fleetName = carrier?.name ?? "Fleet"
  const notified = await notifyOwnerDigest(carrierId, fleetName, lines)

  const to = settings.notifications.officeEmail
  if (!to) return { sent: false, notified, emailed: false, reason: "no_office_email" }

  // Dynamic so nodemailer stays out of the module graph of pages that import
  // digest helpers for tests or tenancy sweeps.
  const { createMailTransport, isEmailConfigured, mailFrom } = await import("@/lib/mailer")
  if (!isEmailConfigured()) {
    return { sent: false, notified, emailed: false, reason: "not_configured" }
  }

  try {
    await createMailTransport().sendMail({
      from: mailFrom(carrier?.name ?? "LoadOff"),
      to,
      subject: `${fleetName} — your Monday numbers`,
      text: `${lines.join("\n")}\n\nOpen the Hub: ${appPublicOrigin()}/hub`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    throw new Error(
      `owner digest email failed (Monday numbers delivered in-app instead): ${message}`
    )
  }
  return { sent: true, notified, emailed: true }
}

/**
 * One summary notification per carrier per run, deduped over 20 hours so a
 * hand-triggered re-run on top of the Monday cron does not double-page the
 * office (same window runComplianceAlerts / runHosViolationAlerts use).
 */
async function notifyOwnerDigest(
  carrierId: string,
  fleetName: string,
  lines: string[]
): Promise<boolean> {
  const recent = await query(
    `SELECT 1 FROM hub.notifications
     WHERE carrier_id = $1 AND kind = 'owner_digest'
       AND created_at > NOW() - INTERVAL '20 hours'
     LIMIT 1`,
    [carrierId]
  )
  if (recent.length > 0) return false

  await notifyRoles(carrierId, ["owner"], {
    kind: "owner_digest",
    title: `${fleetName} — your Monday numbers`,
    body: lines.join("\n"),
    link: "/hub",
  })
  return true
}
