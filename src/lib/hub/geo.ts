/**
 * Pure geo helpers for the IFTA engine: great-circle distance and
 * point-in-state lookup against bundled Census state boundaries
 * (simplified outer rings, ~110m precision — ample for state assignment).
 */
import statesData from "./data/us-states.json"

type StateRings = { state: string; rings: [number, number][][] }
const STATES = statesData as StateRings[]

const EARTH_RADIUS_MILES = 3958.7613

/** Haversine great-circle distance in miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a))
}

/** Ray-casting point-in-polygon (ring is [lng, lat] pairs). */
function inRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Two-letter state code containing the point, or null (e.g. over water/Canada). */
export function stateForPoint(lat: number, lng: number): string | null {
  for (const state of STATES) {
    for (const ring of state.rings) {
      if (inRing(lng, lat, ring)) return state.state
    }
  }
  return null
}

/**
 * Allocate ordered pings into per-jurisdiction miles. Each segment's distance
 * goes to the jurisdiction of its midpoint (falling back to either endpoint).
 * Segments longer than `maxSegmentMiles` are skipped as GPS glitches.
 */
export interface PingPoint {
  lat: number
  lng: number
  ts: string | Date
}

export function jurisdictionMilesFromPings(
  pings: PingPoint[],
  maxSegmentMiles = 120
): Record<string, number> {
  const result: Record<string, number> = {}
  const sorted = [...pings].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  )
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]
    const b = sorted[i]
    const miles = haversineMiles(a.lat, a.lng, b.lat, b.lng)
    if (miles <= 0 || miles > maxSegmentMiles) continue
    const state =
      stateForPoint((a.lat + b.lat) / 2, (a.lng + b.lng) / 2) ??
      stateForPoint(b.lat, b.lng) ??
      stateForPoint(a.lat, a.lng)
    if (!state) continue
    result[state] = (result[state] ?? 0) + miles
  }
  for (const key of Object.keys(result)) {
    result[key] = Math.round(result[key] * 100) / 100
  }
  return result
}
