/** Free NHTSA vPIC VIN decoder — no API key required. */

export interface VinDecodeResult {
  year: number | null
  make: string | null
  model: string | null
}

export async function decodeVin(vin: string): Promise<VinDecodeResult | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const row = data?.Results?.[0]
    if (!row) return null
    const year = Number(row.ModelYear)
    return {
      year: Number.isFinite(year) && year > 1900 ? year : null,
      make: row.Make ? String(row.Make) : null,
      model: row.Model ? String(row.Model) : null,
    }
  } catch {
    return null
  }
}
