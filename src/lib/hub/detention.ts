/**
 * Detention: two halves. `getDwellingStops`/`runDetentionAlerts` surface a
 * stop that's dwelling right now, past free time, before anyone knows the
 * final total. `applyDetentionAccrual` runs the moment a stop closes
 * (departed_at is set, office or driver side) and bills it automatically —
 * no one has to notice and click a button.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"
import { detentionCents } from "./money"
import { addLoadEvent, getLoad, getLoadStops } from "./loads"
import { notifyRoles } from "./notify"
import { logAudit } from "./audit"
import type { Accessorial } from "./types"

export interface DwellingStop {
  loadId: string
  loadReference: string
  stopId: string
  city: string
  state: string
  type: "pickup" | "delivery"
  arrivedAt: string
  hoursOver: number
  estimatedCents: number
}

/** Every open stop (arrived, not yet departed) currently past free time. */
export async function getDwellingStops(carrierId: string): Promise<DwellingStop[]> {
  const settings = await getCarrierSettings(carrierId)
  const rows = await query<{
    stop_id: string; load_id: string; load_reference: string
    city: string; state: string; type: "pickup" | "delivery"; arrived_at: string
  }>(
    `SELECT s.id AS stop_id, s.load_id, l.reference AS load_reference,
       s.city, s.state, s.type, s.arrived_at
     FROM hub.stops s
     JOIN hub.loads l ON l.id = s.load_id
     WHERE s.carrier_id = $1 AND s.arrived_at IS NOT NULL AND s.departed_at IS NULL
       AND l.deleted_at IS NULL AND l.status NOT IN ('settled', 'cancelled')`,
    [carrierId]
  )
  const now = new Date()
  return rows
    .map((row) => {
      const arrivedAt = new Date(row.arrived_at)
      const hoursOver = (now.getTime() - arrivedAt.getTime()) / 3600000 - settings.detention.freeHours
      const estimatedCents = detentionCents(arrivedAt, now, settings.detention.freeHours, settings.detention.ratePerHourCents)
      return {
        loadId: row.load_id, loadReference: row.load_reference, stopId: row.stop_id,
        city: row.city, state: row.state, type: row.type, arrivedAt: row.arrived_at,
        hoursOver, estimatedCents,
      }
    })
    .filter((s) => s.hoursOver > 0 && s.estimatedCents > 0)
}

/**
 * Cron job (see /api/hub/cron/[job] "detention-alerts"): notifies
 * dispatcher/owner once per dwell episode. Idempotent via load_events —
 * skips a stop already alerted since it arrived (a stop's arrived_at is set
 * once, so a later alert for the same episode always has an earlier event).
 */
export async function runDetentionAlerts(carrierId: string): Promise<{ checked: number; alerted: number }> {
  const dwelling = await getDwellingStops(carrierId)
  let alerted = 0
  for (const stop of dwelling) {
    const already = await query(
      `SELECT 1 FROM hub.load_events
       WHERE carrier_id = $1 AND load_id = $2 AND kind = 'exception'
         AND payload->>'type' = 'detention_alert' AND payload->>'stopId' = $3
         AND created_at > $4
       LIMIT 1`,
      [carrierId, stop.loadId, stop.stopId, stop.arrivedAt]
    )
    if (already.length > 0) continue

    await addLoadEvent(carrierId, stop.loadId, "exception", {
      type: "detention_alert", stopId: stop.stopId,
      hoursOver: stop.hoursOver, estimatedCents: stop.estimatedCents,
    }, { id: null, name: "System" })
    await notifyRoles(carrierId, ["dispatcher", "owner"], {
      kind: "detention_alert",
      title: `${stop.loadReference} dwelling ${stop.hoursOver.toFixed(1)}h over free time`,
      body: `${stop.city}, ${stop.state} — est. detention $${(stop.estimatedCents / 100).toFixed(2)}. Mark departed on the load page once it moves to bill it.`,
      link: `/hub/loads/${stop.loadId}`,
    })
    alerted++
  }
  return { checked: dwelling.length, alerted }
}

export interface DetentionAccrualResult {
  ok: boolean
  changed: boolean
  amountCents: number
  error?: string
}

/**
 * Recompute detention from stop timestamps and upsert it onto the load as a
 * single "Detention" accessorial — the settled total across every stop that
 * has both arrived_at and departed_at, not a per-episode append. Called
 * automatically whenever a stop is marked departed (office or driver side)
 * so a dispatcher never has to notice and click a button; also callable
 * directly to recompute a load whose settings changed after the fact.
 * Never shrinks or removes an already-billed amount — only grows it.
 */
export async function applyDetentionAccrual(
  carrierId: string,
  loadId: string,
  actor: { id: string | null; name: string }
): Promise<DetentionAccrualResult> {
  const load = await getLoad(carrierId, loadId)
  if (!load) return { ok: false, changed: false, amountCents: 0, error: "Load not found" }

  const settings = await getCarrierSettings(carrierId)
  const stops = await getLoadStops(carrierId, loadId)
  let total = 0
  const detail: string[] = []
  for (const stop of stops) {
    if (!stop.arrived_at || !stop.departed_at) continue
    const cents = detentionCents(
      new Date(stop.arrived_at), new Date(stop.departed_at),
      settings.detention.freeHours, settings.detention.ratePerHourCents
    )
    if (cents > 0) {
      total += cents
      detail.push(`${stop.city}, ${stop.state}: $${(cents / 100).toFixed(2)}`)
    }
  }

  const accessorials: Accessorial[] = Array.isArray(load.accessorials) ? load.accessorials : []
  const existingIndex = accessorials.findIndex((a) => /detention/i.test(a.label))
  const existingCents = existingIndex >= 0 ? Number(accessorials[existingIndex].amount_cents || 0) : 0
  if (total <= existingCents) {
    return { ok: true, changed: false, amountCents: existingCents }
  }

  const updated =
    existingIndex >= 0
      ? accessorials.map((a, i) => (i === existingIndex ? { ...a, amount_cents: total } : a))
      : [...accessorials, { label: "Detention", amount_cents: total }]

  await query(
    `UPDATE hub.loads SET accessorials = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, loadId, JSON.stringify(updated)]
  )
  await addLoadEvent(carrierId, loadId, "detention", {
    amount_cents: total, detail,
    freeHours: settings.detention.freeHours, ratePerHourCents: settings.detention.ratePerHourCents,
  }, actor)
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "load", entityId: loadId,
    action: existingIndex >= 0 ? "detention_recomputed" : "detention_drafted",
    oldValue: existingIndex >= 0 ? { amountCents: existingCents } : undefined,
    newValue: { amountCents: total, detail },
  })

  return { ok: true, changed: true, amountCents: total }
}
