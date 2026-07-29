/**
 * Freight markets we quote out of and into, with coordinates, so the lane
 * estimator can answer "how far and how long" without a routing API key.
 *
 * Coordinates are city-centre; the estimator applies a road-circuity factor to
 * turn great-circle miles into practical driving miles. That is an estimate and
 * the UI says so — the exact number comes from dispatch. Where we already know
 * a lane's real driving distance (the lanes we run weekly, in market-data.ts),
 * that measured number is used instead of the estimate.
 */

export interface FreightMarket {
  /** "Kent, WA" — matches the label format used in MARKET_DATA.hotLanes. */
  label: string
  lat: number
  lon: number
  region: "Pacific NW" | "West" | "Southwest" | "Mountain" | "Midwest" | "South" | "East"
}

export const FREIGHT_MARKETS: readonly FreightMarket[] = [
  { label: "Kent, WA", lat: 47.381, lon: -122.235, region: "Pacific NW" },
  { label: "Seattle, WA", lat: 47.606, lon: -122.332, region: "Pacific NW" },
  { label: "Tacoma, WA", lat: 47.253, lon: -122.444, region: "Pacific NW" },
  { label: "Spokane, WA", lat: 47.659, lon: -117.426, region: "Pacific NW" },
  { label: "Portland, OR", lat: 45.515, lon: -122.678, region: "Pacific NW" },
  { label: "Boise, ID", lat: 43.615, lon: -116.202, region: "Mountain" },
  { label: "Billings, MT", lat: 45.783, lon: -108.501, region: "Mountain" },
  { label: "Salt Lake City, UT", lat: 40.761, lon: -111.891, region: "Mountain" },
  { label: "Denver, CO", lat: 39.739, lon: -104.99, region: "Mountain" },
  { label: "Reno, NV", lat: 39.53, lon: -119.814, region: "West" },
  { label: "Sacramento, CA", lat: 38.582, lon: -121.494, region: "West" },
  { label: "San Francisco, CA", lat: 37.775, lon: -122.419, region: "West" },
  { label: "Los Angeles, CA", lat: 34.052, lon: -118.244, region: "West" },
  { label: "Las Vegas, NV", lat: 36.171, lon: -115.139, region: "Southwest" },
  { label: "Phoenix, AZ", lat: 33.448, lon: -112.074, region: "Southwest" },
  { label: "Albuquerque, NM", lat: 35.084, lon: -106.651, region: "Southwest" },
  { label: "El Paso, TX", lat: 31.759, lon: -106.487, region: "Southwest" },
  { label: "Dallas, TX", lat: 32.777, lon: -96.797, region: "South" },
  { label: "Houston, TX", lat: 29.76, lon: -95.37, region: "South" },
  { label: "Laredo, TX", lat: 27.506, lon: -99.507, region: "South" },
  { label: "Oklahoma City, OK", lat: 35.468, lon: -97.516, region: "South" },
  { label: "Kansas City, MO", lat: 39.1, lon: -94.579, region: "Midwest" },
  { label: "Minneapolis, MN", lat: 44.978, lon: -93.265, region: "Midwest" },
  { label: "Chicago, IL", lat: 41.878, lon: -87.63, region: "Midwest" },
  { label: "Indianapolis, IN", lat: 39.768, lon: -86.158, region: "Midwest" },
  { label: "Columbus, OH", lat: 39.961, lon: -82.999, region: "Midwest" },
  { label: "Memphis, TN", lat: 35.15, lon: -90.049, region: "South" },
  { label: "Nashville, TN", lat: 36.163, lon: -86.781, region: "South" },
  { label: "Atlanta, GA", lat: 33.749, lon: -84.388, region: "South" },
  { label: "Jacksonville, FL", lat: 30.332, lon: -81.656, region: "South" },
  { label: "Charlotte, NC", lat: 35.227, lon: -80.843, region: "East" },
  { label: "Harrisburg, PA", lat: 40.273, lon: -76.885, region: "East" },
  { label: "Newark, NJ", lat: 40.736, lon: -74.172, region: "East" },
] as const

/**
 * Great-circle → practical driving miles. Checked against the lanes we run:
 * Seattle–LA (960 gc / 1,137 real), Seattle–Chicago (1,737 / 2,064),
 * Seattle–Denver (1,024 / 1,323). 1.20 sits in the middle of that spread;
 * mountain routing runs high, flat interstate runs low, hence the stated ±.
 */
export const ROAD_CIRCUITY = 1.2

const R_MILES = 3958.8
const rad = (deg: number) => (deg * Math.PI) / 180

/** Haversine great-circle distance in miles. */
export function greatCircleMiles(a: FreightMarket, b: FreightMarket): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Hours-of-service transit, the way a dispatcher actually plans it:
 * 11 driving hours in a 14-hour on-duty window, then a 10-hour reset.
 * `fast` assumes clean interstate at 58 mph; `slow` leaves room for the
 * shipper's dock, scales, weather, and a legal break.
 */
export function transitDays(miles: number): { fast: number; slow: number } {
  return {
    fast: Math.max(1, Math.ceil(miles / (11 * 58))),
    slow: Math.max(1, Math.ceil(miles / (11 * 47))),
  }
}
