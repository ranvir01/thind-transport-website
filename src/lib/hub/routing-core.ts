/**
 * Pure routing helpers (client + test safe — no network, no DB).
 *
 * The mileage a load ships with feeds driver pay, rate-per-mile, and IFTA, so a
 * "suggest miles" that's occasionally unreachable must still degrade to a sane
 * number rather than nothing. US intercity roads run roughly 20% longer than
 * the great-circle line; that factor turns a straight-line distance into a
 * defensible drive-mile estimate when no routing provider answers.
 */

export type MilesSource = "go-worker" | "osrm" | "mapbox" | "estimate"

/** Roads wind ~20% longer than straight-line for typical US intercity lanes. */
export const ROAD_WINDING_FACTOR = 1.2

/** Great-circle miles → estimated drive miles. 0 in, 0 out (no negative/NaN). */
export function estimateRoadMiles(straightLineMiles: number, factor = ROAD_WINDING_FACTOR): number {
  if (!(straightLineMiles > 0)) return 0
  return Math.round(straightLineMiles * factor)
}

/** Plain-language provenance for the suggested number (shown next to it). */
export function milesSourceLabel(source: MilesSource): string {
  switch (source) {
    case "go-worker": return "OSRM routing (worker)"
    case "osrm": return "OSRM routing"
    case "mapbox": return "Mapbox routing"
    case "estimate": return "distance estimate"
  }
}
