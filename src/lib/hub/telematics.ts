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
import { notifyRoles } from "./notify"

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
 * Pure normalizers — kept separate from the fetch calls so they're
 * unit-testable (__tests__/telematics.test.ts) without a live feed. Field
 * names are docs/integrations/truckercloud.md's best guess; adjust here the
 * day a real feed response comes back.
 */
export function normalizeTruckerCloudVehicle(row: Record<string, unknown>): TelematicsVehicle {
  const location = (row.lastLocation ?? {}) as Record<string, unknown>
  return {
    externalId: String(row.assetId ?? ""),
    unitHint: (row.unitNumber as string) ?? null,
    lat: typeof location.lat === "number" ? location.lat : null,
    lng: typeof location.lng === "number" ? location.lng : null,
    odometerMiles: typeof location.odometer === "number" ? location.odometer : null,
    locatedAt: (location.timestamp as string) ?? null,
  }
}

export function normalizeTruckerCloudHos(row: Record<string, unknown>): TelematicsHos {
  return {
    externalDriverId: String(row.driverId ?? ""),
    driverNameHint: (row.driverName as string) ?? null,
    dutyStatus: (row.status as string) ?? null,
    driveRemainingMinutes: minutes(row.driveTimeRemainingSec),
    shiftRemainingMinutes: minutes(row.shiftTimeRemainingSec),
    cycleRemainingMinutes: minutes(row.cycleTimeRemainingSec),
    ts: (row.recordedAt as string) ?? new Date().toISOString(),
  }
}

/**
 * TruckerCloud (truckercloud.com, "Apollo API") — the drop-in second
 * aggregator this file's header comment has promised since Terminal shipped.
 * Auth is OAuth2 client-credentials (docs/hub-go-live-requirements.md lists
 * TruckerCloud as needing a "Client ID + secret"): the token endpoint
 * exchanges clientId/clientSecret for a bearer token, re-fetched fresh on
 * every sync (no caching yet — revisit if a real account shows tokens are
 * short-lived enough to matter).
 */
export function truckerCloudSource(carrierId: string): TelematicsSource {
  const base = process.env.TRUCKERCLOUD_API_BASE ?? "https://api.truckercloud.com/v1"
  const token = async () => {
    const creds = await getCredentials(carrierId, "truckercloud")
    if (!creds?.clientId || !creds?.clientSecret) throw new Error("TruckerCloud not connected")
    const response = await fetch(`${base}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: creds.clientId, client_secret: creds.clientSecret, grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`TruckerCloud token → HTTP ${response.status}`)
    const json = (await response.json()) as { access_token?: string }
    if (!json.access_token) throw new Error("TruckerCloud token response missing access_token")
    return json.access_token
  }
  const request = async (path: string) => {
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${await token()}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`TruckerCloud ${path} → HTTP ${response.status}`)
    return response.json() as Promise<Record<string, unknown>>
  }

  return {
    provider: "truckercloud",
    async connected() {
      return hasCredentials(carrierId, "truckercloud")
    },
    async vehicles() {
      const json = await request("/vehicles")
      return ((json.vehicles ?? []) as Record<string, unknown>[]).map(normalizeTruckerCloudVehicle)
    },
    async hos() {
      const json = await request("/hos")
      return ((json.logs ?? []) as Record<string, unknown>[]).map(normalizeTruckerCloudHos)
    },
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

/**
 * Fleet-wide HOS status board: latest snapshot per active driver, bucketed
 * so a dispatcher can see who's about to run out of clock without opening
 * each load. A snapshot older than HOS_STALE_HOURS is treated as unknown
 * rather than "ok" — a quiet ELD feed must never read as a clean driver.
 */
export type HosLevel = "violation" | "critical" | "warning" | "ok" | "stale"

export interface DriverHosStatus {
  driverId: string
  driverName: string
  dutyStatus: string | null
  driveRemainingMinutes: number | null
  shiftRemainingMinutes: number | null
  cycleRemainingMinutes: number | null
  ts: string
  level: HosLevel
}

const HOS_CRITICAL_MINUTES = 60
const HOS_WARNING_MINUTES = 120
const HOS_STALE_HOURS = 24
const HOS_LEVEL_RANK: Record<HosLevel, number> = { violation: 0, critical: 1, warning: 2, stale: 3, ok: 4 }

export function hosLevel(driveRemainingMinutes: number | null, ts: string, now = Date.now()): HosLevel {
  const ageHours = (now - new Date(ts).getTime()) / 3_600_000
  if (driveRemainingMinutes == null || ageHours > HOS_STALE_HOURS) return "stale"
  if (driveRemainingMinutes <= 0) return "violation"
  if (driveRemainingMinutes <= HOS_CRITICAL_MINUTES) return "critical"
  if (driveRemainingMinutes <= HOS_WARNING_MINUTES) return "warning"
  return "ok"
}

export async function fleetHosStatus(carrierId: string): Promise<DriverHosStatus[]> {
  const rows = await query<{
    driver_id: string; full_name: string; duty_status: string | null
    drive_remaining_minutes: number | null; shift_remaining_minutes: number | null
    cycle_remaining_minutes: number | null; ts: string
  }>(
    `SELECT DISTINCT ON (h.driver_id)
       h.driver_id, (d.first_name || ' ' || d.last_name) AS full_name, h.duty_status,
       h.drive_remaining_minutes, h.shift_remaining_minutes, h.cycle_remaining_minutes, h.ts
     FROM hub.hos_snapshots h
     JOIN hub.drivers d ON d.id = h.driver_id AND d.carrier_id = h.carrier_id
     WHERE h.carrier_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
     ORDER BY h.driver_id, h.ts DESC`,
    [carrierId]
  )
  return rows
    .map((r) => ({
      driverId: r.driver_id,
      driverName: r.full_name,
      dutyStatus: r.duty_status,
      driveRemainingMinutes: r.drive_remaining_minutes,
      shiftRemainingMinutes: r.shift_remaining_minutes,
      cycleRemainingMinutes: r.cycle_remaining_minutes,
      ts: r.ts,
      level: hosLevel(r.drive_remaining_minutes, r.ts),
    }))
    .sort((a, b) => HOS_LEVEL_RANK[a.level] - HOS_LEVEL_RANK[b.level] || a.driverName.localeCompare(b.driverName))
}

/**
 * Called right after runTelematicsSync (same cron run — Hobby plan caps
 * cron jobs, so this rides the existing telematics-sync schedule instead of
 * adding a new one). Dedupes on hub.notifications so a driver stuck in
 * violation only pages dispatch/owner once per ~20h, not every sync.
 */
export async function runHosViolationAlerts(carrierId: string): Promise<{ checked: number; alerted: number }> {
  const statuses = await fleetHosStatus(carrierId)
  const atRisk = statuses.filter((s) => s.level === "violation" || s.level === "critical")
  let alerted = 0
  for (const status of atRisk) {
    const link = `/hub/drivers/${status.driverId}`
    const already = await query(
      `SELECT 1 FROM hub.notifications
       WHERE carrier_id = $1 AND kind = 'hos_violation' AND link = $2
         AND created_at > NOW() - INTERVAL '20 hours'
       LIMIT 1`,
      [carrierId, link]
    )
    if (already.length > 0) continue

    const remaining = status.driveRemainingMinutes ?? 0
    const label = status.level === "violation" ? "out of driving clock" : "almost out of driving clock"
    await notifyRoles(carrierId, ["dispatcher", "owner"], {
      kind: "hos_violation",
      title: `${status.driverName} is ${label}`,
      body: `~${Math.max(remaining, 0)} min drive time left (estimate — the ELD is authoritative). Duty status: ${status.dutyStatus ?? "unknown"}.`,
      link,
    })
    alerted++
  }
  return { checked: atRisk.length, alerted }
}
