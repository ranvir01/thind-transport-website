/**
 * "Suggest miles" — free drive-distance for a lane so the owner never hand-keys
 * mileage (which feeds pay, rate-per-mile, and IFTA). Provider ladder, each
 * optional and tried in order until one answers:
 *   1. OSRM     — free, no key. Public demo by default; self-host via OSRM_URL.
 *   2. Mapbox   — only if NEXT_PUBLIC_MAPBOX_TOKEN is set.
 *   3. Estimate — great-circle × road factor; works whenever both ends geocode.
 *
 * Returns null only when the endpoints can't be geocoded at all — the owner then
 * types miles manually, exactly as before. Never throws. Server-only (geocode
 * cache + outbound fetch); imported from server actions, not the client bundle.
 */
import { geocodeCityState } from "./geocode"
import { haversineMiles } from "./geo"
import { drivingMiles, hasMapbox, type LatLng } from "./mapbox"
import { estimateRoadMiles, type MilesSource } from "./routing-core"

export interface SuggestedMiles {
  miles: number
  source: MilesSource
}

export interface LanePoint {
  city: string | null | undefined
  state: string | null | undefined
}

const METERS_PER_MILE = 1609.344

/** OSRM drive miles between two coordinates. Null on no-route / error / non-200. */
async function osrmMiles(from: LatLng, to: LatLng): Promise<number | null> {
  try {
    const base = process.env.OSRM_URL ?? "https://router.project-osrm.org"
    const url =
      `${base.replace(/\/$/, "")}/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = (await res.json()) as { routes?: { distance?: number }[] }
    const meters = data.routes?.[0]?.distance
    if (meters == null) return null
    return Math.round(meters / METERS_PER_MILE)
  } catch {
    return null
  }
}

/**
 * Suggest drive miles for a City,ST → City,ST lane. Both endpoints are geocoded
 * once (cached Nominatim) and the same coordinates feed every provider, so the
 * fallback never re-geocodes. Returns null if either endpoint is missing or
 * un-geocodable.
 */
export async function suggestMiles(origin: LanePoint, dest: LanePoint): Promise<SuggestedMiles | null> {
  if (!origin.city || !origin.state || !dest.city || !dest.state) return null

  const [a, b] = await Promise.all([
    geocodeCityState(origin.city, origin.state),
    geocodeCityState(dest.city, dest.state),
  ])
  if (!a || !b) return null

  const osrm = await osrmMiles(a, b)
  if (osrm && osrm > 0) return { miles: osrm, source: "osrm" }

  if (hasMapbox()) {
    const mb = await drivingMiles(a, b)
    if (mb && mb > 0) return { miles: mb, source: "mapbox" }
  }

  const estimate = estimateRoadMiles(haversineMiles(a.lat, a.lng, b.lat, b.lng))
  return estimate > 0 ? { miles: estimate, source: "estimate" } : null
}
