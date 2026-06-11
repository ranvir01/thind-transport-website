/**
 * TelematicsSource (Phase 6): the live ELD feed behind an internal interface.
 * TruckX has no public API — it connects through aggregators (Terminal is the
 * first adapter; TruckerCloud is a drop-in second). Without credentials the
 * interface reports "not connected" and the CSV import path keeps working —
 * the rest of the system never knows which path the data arrived through.
 */
import { query, queryOne } from "./db"
import { getCredentials, hasCredentials } from "./credentials"

export interface TelematicsVehicle {
  externalId: string
  unitHint: string | null
  lat: number | null
  lng: number | null
  odometerMiles: number | null
  locatedAt: string | null
}

export interface TelematicsHos {
  externalDriverId: string
  driverNameHint: string | null
  dutyStatus: string | null
  driveRemainingMinutes: number | null
  shiftRemainingMinutes: number | null
  cycleRemainingMinutes: number | null
  ts: string
}

export interface TelematicsSource {
  provider: string
  connected(): Promise<boolean>
  vehicles(): Promise<TelematicsVehicle[]>
  hos(): Promise<TelematicsHos[]>
}

/** Terminal (docs.withterminal.com) — normalized vehicles/HOS across ELDs. */
export function terminalSource(carrierId: string): TelematicsSource {
  const base = process.env.TERMINAL_API_BASE ?? "https://api.withterminal.com/tsp/v1"
  const request = async (path: string) => {
    const creds = await getCredentials(carrierId, "terminal")
    if (!creds?.apiKey || !creds?.connectionToken) throw new Error("Terminal not connected")
    const response = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Connection-Token": creds.connectionToken,
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Terminal ${path} → HTTP ${response.status}`)
    return response.json() as Promise<{ data?: unknown[] }>
  }

  return {
    provider: "terminal",
    async connected() {
      return hasCredentials(carrierId, "terminal")
    },
    async vehicles() {
      const json = await request("/vehicles?expand=latestLocation")
      return ((json.data ?? []) as Record<string, unknown>[]).map((v) => {
        const location = (v.latestLocation ?? {}) as Record<string, unknown>
        return {
          externalId: String(v.id ?? ""),
          unitHint: (v.name as string) ?? (v.licensePlate as string) ?? null,
          lat: typeof location.latitude === "number" ? location.latitude : null,
          lng: typeof location.longitude === "number" ? location.longitude : null,
          odometerMiles: typeof location.odometer === "number" ? location.odometer : null,
          locatedAt: (location.locatedAt as string) ?? null,
        }
      })
    },
    async hos() {
      const json = await request("/hos/available-time")
      return ((json.data ?? []) as Record<string, unknown>[]).map((h) => ({
        externalDriverId: String(h.driverId ?? ""),
        driverNameHint: (h.driverName as string) ?? null,
        dutyStatus: (h.dutyStatus as string) ?? null,
        driveRemainingMinutes: minutes(h.driveRemaining),
        shiftRemainingMinutes: minutes(h.shiftRemaining),
        cycleRemainingMinutes: minutes(h.cycleRemaining),
        ts: (h.updatedAt as string) ?? new Date().toISOString(),
      }))
    },
  }
}

function minutes(value: unknown): number | null {
  if (typeof value === "number") return Math.round(value / 60) // seconds → minutes
  return null
}

/**
 * Scheduled sync (cron `telematics-sync`): positions → position_pings
 * (append-only), odometer hints, HOS → hos_snapshots. Unit matching is by
 * unit-number hint; unmatched vehicles are reported, never guessed.
 */
export async function runTelematicsSync(
  carrierId: string
): Promise<{ connected: boolean; pings?: number; hos?: number; unmatched?: string[] }> {
  const source = terminalSource(carrierId)
  if (!(await source.connected())) return { connected: false }

  const trucks = await query<{ id: string; unit_number: string }>(
    `SELECT id, unit_number FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  const byUnit = new Map(trucks.map((t) => [t.unit_number.toLowerCase(), t.id]))
  const unmatched: string[] = []
  let pings = 0

  for (const vehicle of await source.vehicles()) {
    const truckId = vehicle.unitHint ? byUnit.get(vehicle.unitHint.toLowerCase()) : undefined
    if (!truckId) {
      if (vehicle.unitHint) unmatched.push(vehicle.unitHint)
      continue
    }
    if (vehicle.lat != null && vehicle.lng != null) {
      await query(
        `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, odometer, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'terminal')`,
        [carrierId, truckId, vehicle.locatedAt ?? new Date().toISOString(), vehicle.lat, vehicle.lng, vehicle.odometerMiles]
      )
      pings++
    }
  }

  const drivers = await query<{ id: string; full_name: string }>(
    `SELECT id, lower(first_name || ' ' || last_name) AS full_name
     FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL`,
    [carrierId]
  )
  const byName = new Map(drivers.map((d) => [d.full_name, d.id]))
  let hosCount = 0
  for (const snapshot of await source.hos()) {
    const driverId = snapshot.driverNameHint ? byName.get(snapshot.driverNameHint.toLowerCase()) : undefined
    if (!driverId) continue
    await query(
      `INSERT INTO hub.hos_snapshots (carrier_id, driver_id, ts, duty_status,
         drive_remaining_minutes, shift_remaining_minutes, cycle_remaining_minutes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'terminal')`,
      [
        carrierId, driverId, snapshot.ts, snapshot.dutyStatus,
        snapshot.driveRemainingMinutes, snapshot.shiftRemainingMinutes, snapshot.cycleRemainingMinutes,
      ]
    )
    hosCount++
  }

  return { connected: true, pings, hos: hosCount, unmatched }
}

/**
 * Dispatch-legality estimate: does the remaining drive clock cover the ETA?
 * Clearly labeled an estimate — the ELD is authoritative, always.
 */
export async function hosLegalityWarning(
  carrierId: string,
  driverId: string,
  estimatedDriveHours: number
): Promise<string | null> {
  const snapshot = await queryOne<{ drive_remaining_minutes: number | null; ts: string }>(
    `SELECT drive_remaining_minutes, ts FROM hub.hos_snapshots
     WHERE carrier_id = $1 AND driver_id = $2 ORDER BY ts DESC LIMIT 1`,
    [carrierId, driverId]
  )
  if (!snapshot?.drive_remaining_minutes) return null
  const remainingHours = snapshot.drive_remaining_minutes / 60
  if (estimatedDriveHours > remainingHours) {
    return `ETA needs ~${estimatedDriveHours.toFixed(1)}h of driving but the driver has ~${remainingHours.toFixed(1)}h left (estimate only — the ELD is authoritative)`
  }
  return null
}
