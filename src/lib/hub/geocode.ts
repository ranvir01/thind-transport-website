/**
 * GeocodeSource — free OpenStreetMap Nominatim implementation.
 * Results cached in hub.geocode_cache; lookups respect ~1 req/sec.
 * Phase 7 swaps the implementation behind this same interface.
 */
import { query, queryOne } from "./db"

export interface GeocodeSource {
  geocode(city: string, state: string): Promise<{ lat: number; lng: number } | null>
}

async function nominatimLookup(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${city}, ${state}, USA`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`,
      {
        headers: { "User-Agent": "thindtransport.com hub (thindcarrier@gmail.com)" },
        next: { revalidate: 86400 * 30 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.[0]) return null
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) }
  } catch {
    return null
  }
}

export async function geocodeCityState(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const key = `${city.trim().toLowerCase()},${state.trim().toUpperCase()}`
  try {
    const cached = await queryOne<{ lat: number | null; lng: number | null }>(
      `SELECT lat, lng FROM hub.geocode_cache WHERE query = $1`,
      [key]
    )
    if (cached) return cached.lat != null && cached.lng != null ? { lat: cached.lat, lng: cached.lng } : null
  } catch { /* cache is an optimization, never a blocker */ }

  const result = await nominatimLookup(city, state)
  try {
    await query(
      `INSERT INTO hub.geocode_cache (query, lat, lng) VALUES ($1, $2, $3)
       ON CONFLICT (query) DO NOTHING`,
      [key, result?.lat ?? null, result?.lng ?? null]
    )
  } catch { /* ditto */ }
  return result
}
