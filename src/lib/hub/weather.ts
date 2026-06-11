/** Free National Weather Service alerts — no API key required. */

export interface WeatherAlert {
  event: string
  severity: string
  headline: string
}

/** Active NWS alerts at a point. Best-effort: failures return an empty list. */
export async function getActiveAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`,
      {
        headers: { "User-Agent": "thindtransport.com hub (thindcarrier@gmail.com)" },
        next: { revalidate: 1800 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const features: Array<{ properties?: { event?: string; severity?: string; headline?: string } }> =
      data?.features ?? []
    return features
      .filter((f) => ["Severe", "Extreme"].includes(f.properties?.severity ?? ""))
      .slice(0, 3)
      .map((f) => ({
        event: f.properties?.event ?? "Weather alert",
        severity: f.properties?.severity ?? "Severe",
        headline: f.properties?.headline ?? "",
      }))
  } catch {
    return []
  }
}
