/**
 * The sandbox's shared world data — cities, lanes, customers, commodities —
 * used by BOTH the seed (sandbox-seed.ts) and the real-time simulation
 * (sandbox-sim-*.ts). Pure constants and pure helpers only: no SQL, no
 * server-only imports, unit-testable anywhere.
 */

export interface WorldCity {
  city: string
  state: string
  lat: number
  lng: number
}

export const CITIES: Record<string, WorldCity> = {
  kent: { city: "Kent", state: "WA", lat: 47.3809, lng: -122.2348 },
  seattle: { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  spokane: { city: "Spokane", state: "WA", lat: 47.6588, lng: -117.426 },
  yakima: { city: "Yakima", state: "WA", lat: 46.6021, lng: -120.5059 },
  portland: { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  medford: { city: "Medford", state: "OR", lat: 42.3265, lng: -122.8756 },
  boise: { city: "Boise", state: "ID", lat: 43.615, lng: -116.2023 },
  sacramento: { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944 },
  oakland: { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712 },
  fresno: { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871 },
  reno: { city: "Reno", state: "NV", lat: 39.5296, lng: -119.8138 },
  saltlake: { city: "Salt Lake City", state: "UT", lat: 40.7608, lng: -111.891 },
  denver: { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  phoenix: { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  missoula: { city: "Missoula", state: "MT", lat: 46.8721, lng: -113.994 },
}

export type WorldCityKey = keyof typeof CITIES

/** [origin, destination, loaded miles] — the lanes this carrier actually runs. */
export const LANES: [WorldCityKey, WorldCityKey, number][] = [
  ["kent", "sacramento", 750], ["kent", "portland", 175], ["seattle", "spokane", 280],
  ["yakima", "oakland", 780], ["portland", "boise", 430], ["spokane", "missoula", 200],
  ["boise", "saltlake", 340], ["portland", "reno", 580], ["fresno", "phoenix", 590],
  ["saltlake", "denver", 520], ["sacramento", "fresno", 170], ["medford", "sacramento", 300],
  ["reno", "saltlake", 520], ["seattle", "portland", 175], ["spokane", "boise", 425],
  ["oakland", "medford", 370], ["phoenix", "denver", 820], ["yakima", "portland", 185],
]

export const BROKERS = [
  "Summit Freight Brokerage", "Echo Peak Logistics", "TQ West Logistics", "Landbridge Freight",
  "Copper Canyon Freight", "NorthGate Logistics", "Ridgeway Brokerage", "Bluewater Freight Co",
]

export const COMMODITY: Record<string, string[]> = {
  dry_van: ["Packaged foods", "Paper products", "Beverages", "Retail freight", "Building materials"],
  reefer: ["Fresh produce", "Frozen foods", "Dairy", "Berries", "Apples"],
  flatbed: ["Steel coils", "Lumber", "Machinery", "Rebar"],
}

export const MERCHANTS = ["Pilot #482", "Love's #229", "TA Ontario", "Petro Boise", "Flying J #611", "Pacific Pride Yakima"]

/** Average over-the-road speed the sim moves trucks at, terrain included. */
export const AVG_MPH = 52

export function laneMiles(origin: WorldCityKey, dest: WorldCityKey): number | null {
  const hit = LANES.find(([o, d]) => o === origin && d === dest)
  return hit ? hit[2] : null
}
