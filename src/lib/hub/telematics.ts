/**
 * TelematicsSource (Phase 6): the live ELD feed behind an internal interface.
 * TruckX has no public API — it connects through aggregators (Terminal shipped
 * first; TruckerCloud is the drop-in second — same interface, its own
 * credentials). `activeTelematicsSource` picks whichever one the carrier
 * connected. Without credentials for either, the interface reports "not
 * connected" and the CSV import path keeps working — the rest of the system
 * never knows which path the data arrived through.
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
 * TruckerCloud (truckercloud.com, "Apollo API") — the drop-in second
 * aggregator this file's header comment has promised since Terminal shipped.
 * Auth model is a best-effort guess (docs/integrations/truckercloud.md):
 * TruckerCloud's own docs pages 403 this scout's fetch tooling the same way
 * docs.withterminal.com and the EFS integration pages did, so this assumes a
 * single bearer API key (matching the registry's one-field credential spec)
 * against a normalized vehicles/HOS shape parallel to Terminal's. Swapping in
 * the confirmed shape later only touches the two `normalizeTruckerCloud*`
 * functions below — the adapter, sync loop, and contract tests don't move.
 */
export function truckerCloudSource(carrierId: string): TelematicsSource {
  const base = process.env.TRUCKERCLOUD_API_BASE ?? "https://api.truckercloud.com/v1"
  const request = async (path: string) => {
    const creds = await getCredentials(carrierId, "truckercloud")
    if (!creds?.apiKey) throw new Error("truckercloud not connected")
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`TruckerCloud ${path} → HTTP ${response.status}`)
    return response.json() as Promise<{ data?: unknown[] }>
  }

  return {
    provider: "truckercloud",
    async connected() {
      return hasCredentials(carrierId, "truckercloud")
    },
    async vehicles() {
      const json = await request("/vehicles")
      return ((json.data ?? []) as Record<string, unknown>[]).map(normalizeTruckerCloudVehicle)
    },
    async hos() {
      const json = await request("/hos")
      return ((json.data ?? []) as Record<string, unknown>[]).map(normalizeTruckerCloudHos)
    },
  }
}

/** Pure — the one place TruckerCloud's assumed vehicle shape is read (see truckerCloudSource). */
export function normalizeTruckerCloudVehicle(record: Record<string, unknown>): TelematicsVehicle {
  const location = (record.location ?? {}) as Record<string, unknown>
  return {
    externalId: String(record.vehicleId ?? record.id ?? ""),
    unitHint: (record.unitNumber as string) ?? (record.assetName as string) ?? null,
    lat: typeof location.lat === "number" ? location.lat : null,
    lng: typeof location.lng === "number" ? location.lng : null,
    odometerMiles: typeof location.odometer === "number" ? location.odometer : null,
    locatedAt: (location.timestamp as string) ?? null,
  }
}

/** Pure — the one place TruckerCloud's assumed HOS shape is read (see truckerCloudSource). */
export function normalizeTruckerCloudHos(record: Record<string, unknown>): TelematicsHos {
  return {
    externalDriverId: String(record.driverId ?? ""),
    driverNameHint: (record.driverName as string) ?? null,
    dutyStatus: (record.status as string) ?? null,
    driveRemainingMinutes: minutes(record.driveTimeRemainingSeconds),
    shiftRemainingMinutes: minutes(record.shiftTimeRemainingSeconds),
    cycleRemainingMinutes: minutes(record.cycleTimeRemainingSeconds),
    ts: (record.recordedAt as string) ?? new Date().toISOString(),
  }
}

/**
 * Whichever aggregator the carrier has actually connected — Terminal first
 * (the longer-lived, confirmed adapter), TruckerCloud as the fallback second
 * choice. A carrier connects one ELD aggregator at a time; if both were ever
 * connected simultaneously, Terminal wins rather than merging two feeds.
 */
async function activeTelematicsSource(carrierId: string): Promise<TelematicsSource | null> {
  const terminal = terminalSource(carrierId)
  if (await terminal.connected()) return terminal
  const truckerCloud = truckerCloudSource(carrierId)
  if (await truckerCloud.connected()) return truckerCloud
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
  const source = await activeTelematicsSource(carrierId)
  if (!source) return { connected: false }

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
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [carrierId, truckId, vehicle.locatedAt ?? new Date().toISOString(), vehicle.lat, vehicle.lng, vehicle.odometerMiles, source.provider]
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        carrierId, driverId, snapshot.ts, snapshot.dutyStatus,
        snapshot.driveRemainingMinutes, snapshot.shiftRemainingMinutes, snapshot.cycleRemainingMinutes,
        source.provider,
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
