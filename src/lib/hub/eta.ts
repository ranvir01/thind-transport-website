/**
 * Arrival estimate from the truck's last position — the one ETA in the codebase.
 *
 * This physics used to live privately in planner.ts (`emptyEta`), which meant
 * the planner had an ETA and nothing else did: not the broker's /track page,
 * not the portal, not the load detail. The planner still calls this, then
 * applies its own "whichever is later, the appointment or the physics" rule —
 * right for "when does the truck go EMPTY", wrong for "when does it ARRIVE".
 * A truck two hours out with a 5pm appointment arrives around 3pm; telling the
 * broker "5pm" is the appointment restated, not an estimate.
 *
 * Pure. Road miles are injected (Mapbox Directions when configured, see
 * eta-load.ts) so this never touches the network and a test can pin the
 * arithmetic.
 */

/** Haversine × this ≈ road miles. Interstates are not great circles. */
export const ROAD_FACTOR = 1.2
/** Loaded truck, average over a day including fuel and a 30 — not a cruising speed. */
export const AVG_MPH = 47
/**
 * A ping older than this says nothing about where the truck is now. A
 * three-day-old position produces a confidently wrong ETA; no ETA beats that.
 */
export const MAX_PING_AGE_HOURS = 6

export interface EtaPing {
  lat: number
  lng: number
  ts: string | Date
}

export interface Eta {
  /** When the truck is expected at the destination. */
  at: Date
  /** Road miles remaining (Mapbox when supplied, haversine × ROAD_FACTOR otherwise). */
  miles: number
  driveHours: number
  /** "physics" — from the ping. "appointment" is reserved for callers that fall back. */
  basis: "physics"
  /** Minutes past the appointment window (apptEnd, else apptStart). Never negative. */
  lateMinutes: number
  /** True when the ping is on the older side (> half the max age) — show "~", not a clock. */
  stale: boolean
}

export interface EtaInput {
  ping: EtaPing | null | undefined
  dest: { lat: number | null | undefined; lng: number | null | undefined } | null | undefined
  apptStart?: string | Date | null
  apptEnd?: string | Date | null
  /** Driving miles from a router, when available. Overrides the haversine estimate. */
  roadMiles?: number | null
  now?: Date
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Haversine great-circle miles. Duplicated from geo.ts on purpose: geo.ts drags in the state-boundary JSON. */
export function greatCircleMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Null means "we do not know", and callers must show nothing rather than a
 * guess: no ping, a ping too old to trust, or a destination without coordinates.
 */
export function estimateArrival(input: EtaInput): Eta | null {
  const now = input.now ?? new Date()
  const ping = input.ping
  const dest = input.dest
  if (!ping || !dest || dest.lat == null || dest.lng == null) return null

  const pingAt = toDate(ping.ts)
  if (!pingAt) return null
  const ageHours = (now.getTime() - pingAt.getTime()) / 3_600_000
  if (ageHours > MAX_PING_AGE_HOURS) return null

  const miles =
    input.roadMiles != null && input.roadMiles >= 0
      ? input.roadMiles
      : greatCircleMiles(ping.lat, ping.lng, dest.lat, dest.lng) * ROAD_FACTOR
  const driveHours = miles / AVG_MPH
  // Drive time counts from the PING, not from now: the truck has been moving
  // since it reported. A fresh ping and this are the same thing; a two-hour-old
  // ping is two hours closer than "now + drive time" would claim.
  const at = new Date(pingAt.getTime() + driveHours * 3_600_000)

  const window = toDate(input.apptEnd) ?? toDate(input.apptStart)
  const lateMinutes = window ? Math.max(0, Math.round((at.getTime() - window.getTime()) / 60_000)) : 0

  return {
    at,
    miles: Math.round(miles),
    driveHours: Math.round(driveHours * 100) / 100,
    basis: "physics",
    lateMinutes,
    stale: ageHours > MAX_PING_AGE_HOURS / 2,
  }
}

/** Round to the nearest 5 minutes — an estimate shown to the minute reads as a promise. */
export function roundEta(at: Date, minutes = 5): Date {
  const ms = minutes * 60_000
  return new Date(Math.round(at.getTime() / ms) * ms)
}

/** "~3:40 PM" or "~Tue 3:40 PM" when the arrival is not today. Broker-facing copy. */
export function formatEta(eta: Eta, now = new Date(), timeZone?: string): string {
  const at = roundEta(eta.at)
  const sameDay = at.toDateString() === now.toDateString()
  const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone })
  if (sameDay) return `~${time}`
  const day = at.toLocaleDateString("en-US", { weekday: "short", timeZone })
  return `~${day} ${time}`
}
