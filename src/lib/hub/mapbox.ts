/**
 * Mapbox helpers — geocoding + routing-grade driving miles.
 *
 * Powers accurate loaded/empty miles (feeding pay, IFTA, and CPM) and richer
 * map tiles. Degrades gracefully: when NEXT_PUBLIC_MAPBOX_TOKEN is unset every
 * function returns null so callers fall back to the existing Nominatim geocoder
 * and manually-entered miles — the app never hard-depends on Mapbox.
 *
 * The token is a Mapbox *public* (`pk.`) token, safe to expose to the browser,
 * so it lives in NEXT_PUBLIC_MAPBOX_TOKEN and is read both client- and server-side.
 */

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || ""

export function hasMapbox(): boolean {
  return Boolean(TOKEN)
}

export interface LatLng {
  lat: number
  lng: number
}

const METERS_PER_MILE = 1609.344

/** Geocode a "City, ST" or full address to a coordinate. Null on no token / no match / error. */
export async function geocodeMapbox(queryText: string): Promise<LatLng | null> {
  if (!TOKEN || !queryText.trim()) return null
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryText)}.json` +
      `?access_token=${TOKEN}&country=us&limit=1&types=place,address,postcode`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { features?: { center?: [number, number] }[] }
    const center = data.features?.[0]?.center
    if (!center) return null
    return { lng: center[0], lat: center[1] }
  } catch {
    return null
  }
}

/** Driving miles between two points via the Mapbox Directions API. Null on no token / no route / error. */
export async function drivingMiles(from: LatLng, to: LatLng): Promise<number | null> {
  if (!TOKEN) return null
  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
      `?access_token=${TOKEN}&overview=false&annotations=distance`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { routes?: { distance?: number }[] }
    const meters = data.routes?.[0]?.distance
    if (meters == null) return null
    return Math.round(meters / METERS_PER_MILE)
  } catch {
    return null
  }
}

/** Convenience: driving miles between two "City, ST" strings (geocode both, then route). */
export async function drivingMilesBetween(origin: string, dest: string): Promise<number | null> {
  if (!TOKEN) return null
  const [a, b] = await Promise.all([geocodeMapbox(origin), geocodeMapbox(dest)])
  if (!a || !b) return null
  return drivingMiles(a, b)
}
