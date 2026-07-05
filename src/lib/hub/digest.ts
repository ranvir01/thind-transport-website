/**
 * Weekly owner digest (Phase 6 §9): the Monday-morning numbers email —
 * everything real, nothing fabricated, links straight into the Hub.
 */
import { queryOne } from "./db"
import { getCarrier, getCarrierSettings } from "./settings"

export async function sendOwnerDigest(carrierId: string): Promise<{ sent: boolean }> {
  const [carrier, settings] = await Promise.all([
    getCarrier(carrierId),
    getCarrierSettings(carrierId),
  ])
  const to = settings.notifications.officeEmail
  if (!to) return { sent: false }

  const stats = await queryOne<{
    revenue_week: string; delivered_week: string; unbilled: string
    ar_open: string; ar_overdue: string; settlements_draft: string
    red_compliance_drivers: string; empty_trucks: string
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
          AND NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id)) AS unbilled,
       COALESCE((SELECT SUM(i.amount_cents - COALESCE(p.paid, 0)) FROM hub.invoices i
         LEFT JOIN LATERAL (SELECT SUM(amount_cents) AS paid FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id) p ON TRUE
         WHERE i.carrier_id = $1 AND i.status NOT IN ('paid','disputed')), 0) AS ar_open,
       (SELECT COUNT(*) FROM hub.invoices WHERE carrier_id = $1 AND status = 'overdue') AS ar_overdue,
       (SELECT COUNT(*) FROM hub.settlements WHERE carrier_id = $1 AND status = 'draft') AS settlements_draft,
       (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'
          AND (cdl_expiry < CURRENT_DATE OR medical_card_expiry < CURRENT_DATE)) AS red_compliance_drivers,
       (SELECT COUNT(*) FROM hub.trucks t WHERE t.carrier_id = $1 AND t.deleted_at IS NULL AND t.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM hub.loads l WHERE l.truck_id = t.id AND l.deleted_at IS NULL
            AND l.status IN ('booked','dispatched','at_pickup','in_transit'))) AS empty_trucks`,
    [carrierId]
  )
  if (!stats) return { sent: false }

  const dollars = (cents: string) => `$${(Number(cents) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  const lines = [
    `Booked this week: ${dollars(stats.revenue_week)}  ·  ${stats.delivered_week} load(s) delivered`,
    `Owed to you: ${dollars(stats.ar_open)} open AR${Number(stats.ar_overdue) > 0 ? ` (${stats.ar_overdue} overdue!)` : ""}`,
    `Unbilled PODs: ${stats.unbilled} — every one is money sitting on the floor`,
    `Settlements waiting on approval: ${stats.settlements_draft}`,
    `Trucks empty right now: ${stats.empty_trucks}`,
    Number(stats.red_compliance_drivers) > 0
      ? `⚠ ${stats.red_compliance_drivers} driver(s) with an EXPIRED CDL or med card`
      : `Compliance: no expired driver documents`,
  ]

  const { createMailTransport, mailFrom } = await import("@/lib/mailer")
  await createMailTransport().sendMail({
    from: mailFrom(carrier?.name ?? "LoadOff"),
    to,
    subject: `${carrier?.name ?? "Fleet"} — your Monday numbers`,
    text: `${lines.join("\n")}\n\nOpen the Hub: ${process.env.NEXTAUTH_URL ?? ""}/hub`,
  })
  return { sent: true }
}
