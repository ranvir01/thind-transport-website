/**
 * DB half of the ETA (pure half: eta.ts — the hvut.ts / hvut-compliance.ts split).
 *
 * "Next stop" is the first stop in sequence the truck has not arrived at, of
 * either type: a dispatched load's ETA is to the pickup, an in-transit load's
 * is to the delivery. Every query carries carrier_id; a load id alone never
 * reaches another tenant's ping.
 */
import { queryOne } from "./db"
import { estimateArrival, type Eta } from "./eta"
import { drivingMiles, hasMapbox } from "./mapbox"

export interface EtaTarget {
  stopId: string
  type: "pickup" | "delivery"
  city: string
  state: string
  apptStart: string | null
  apptEnd: string | null
}

export interface LoadEta {
  eta: Eta
  target: EtaTarget
}

const ROLLING: ReadonlySet<string> = new Set(["dispatched", "at_pickup", "in_transit"])

export async function loadEta(carrierId: string, loadId: string): Promise<LoadEta | null> {
  const load = await queryOne<{ truck_id: string | null; status: string }>(
    `SELECT truck_id, status FROM hub.loads
     WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, loadId]
  )
  if (!load?.truck_id || !ROLLING.has(load.status)) return null

  const [ping, stop] = await Promise.all([
    queryOne<{ lat: number; lng: number; ts: string }>(
      `SELECT lat, lng, ts FROM hub.position_pings
       WHERE carrier_id = $1 AND truck_id = $2 ORDER BY ts DESC LIMIT 1`,
      [carrierId, load.truck_id]
    ),
    queryOne<{
      id: string; type: "pickup" | "delivery"; city: string; state: string
      lat: number | null; lng: number | null; appt_start: string | null; appt_end: string | null
    }>(
      `SELECT id, type, city, state, lat, lng, appt_start, appt_end FROM hub.stops
       WHERE carrier_id = $1 AND load_id = $2 AND arrived_at IS NULL
       ORDER BY sequence LIMIT 1`,
      [carrierId, loadId]
    ),
  ])
  if (!ping || !stop || stop.lat == null || stop.lng == null) return null

  // Routing-grade miles when the token is set; the pure function falls back to
  // haversine × road factor on null, so an API hiccup degrades rather than fails.
  const roadMiles = hasMapbox()
    ? await drivingMiles({ lat: ping.lat, lng: ping.lng }, { lat: stop.lat, lng: stop.lng })
    : null

  const eta = estimateArrival({
    ping, dest: stop, roadMiles, apptStart: stop.appt_start, apptEnd: stop.appt_end,
  })
  if (!eta) return null

  return {
    eta,
    target: {
      stopId: stop.id, type: stop.type, city: stop.city, state: stop.state,
      apptStart: stop.appt_start, apptEnd: stop.appt_end,
    },
  }
}
