/** Free OpenStreetMap Nominatim geocoding (best-effort, rate-limit friendly). */

export async function geocodeCityState(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
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
