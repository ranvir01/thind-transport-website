/**
 * Detention auto-alert: addDetentionAction (src/app/hub/_actions/loads.ts)
 * only bills a stop once it has BOTH arrived_at and departed_at — a human
 * has to notice a truck is still sitting and click "Add detention" before
 * it closes out. This surfaces stops that are dwelling right now, past free
 * time, so the dispatch board and a cron alert catch it without anyone
 * watching the clock.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"
import { detentionCents } from "./money"
import { addLoadEvent } from "./loads"
import { notifyRoles } from "./notify"

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
