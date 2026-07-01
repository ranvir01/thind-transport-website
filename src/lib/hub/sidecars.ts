/**
 * Optional Go/Rust sidecar clients.
 *
 * When HAULDESK_GO_WORKER_URL / HAULDESK_RUST_COMPUTE_URL are unset, every
 * function falls back to the existing pure-TypeScript implementations so
 * production on Vercel behaves exactly as before.
 */

import { haversineMiles } from "./geo"
import { computeIfta, type IftaInputs, type IftaResult } from "./ifta-core"
import { drivingMiles, type LatLng } from "./mapbox"

const GO_WORKER_URL = process.env.HAULDESK_GO_WORKER_URL?.replace(/\/$/, "") ?? ""
const RUST_COMPUTE_URL = process.env.HAULDESK_RUST_COMPUTE_URL?.replace(/\/$/, "") ?? ""

export function hasGoWorker(): boolean {
  return Boolean(GO_WORKER_URL)
}

export function hasRustCompute(): boolean {
  return Boolean(RUST_COMPUTE_URL)
}

export interface RouteMilesRequest {
  origin: LatLng
  dest: LatLng
}

export type RouteMilesSource = "go-worker" | "mapbox" | "haversine"

export interface RouteMilesResult {
  miles: number
  source: RouteMilesSource
}

/** Driving miles between two coordinates. Go worker → Mapbox → haversine fallback. */
export async function routeMiles(req: RouteMilesRequest): Promise<RouteMilesResult> {
  if (GO_WORKER_URL) {
    try {
      const res = await fetch(`${GO_WORKER_URL}/route/miles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const data = (await res.json()) as { miles?: number }
        if (typeof data.miles === "number" && Number.isFinite(data.miles)) {
          return { miles: Math.round(data.miles), source: "go-worker" }
        }
      }
    } catch {
      // fall through to TS
    }
  }

  const mapboxMiles = await drivingMiles(req.origin, req.dest)
  if (mapboxMiles != null) {
    return { miles: mapboxMiles, source: "mapbox" }
  }

  const miles = Math.round(
    haversineMiles(req.origin.lat, req.origin.lng, req.dest.lat, req.dest.lng)
  )
  return { miles, source: "haversine" }
}

export type IftaSummarySource = "rust-compute" | "typescript"

export type IftaSummaryResult = IftaResult & { source: IftaSummarySource }

/** Quarterly IFTA tax summary. Rust compute → `computeIfta` fallback. */
export async function iftaSummary(inputs: IftaInputs): Promise<IftaSummaryResult> {
  if (RUST_COMPUTE_URL) {
    try {
      const res = await fetch(`${RUST_COMPUTE_URL}/ifta/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        const data = (await res.json()) as IftaResult
        return { ...data, source: "rust-compute" }
      }
    } catch {
      // fall through to TS
    }
  }

  return { ...computeIfta(inputs), source: "typescript" }
}
