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

/** Shared-secret header both sidecars verify when HAULDESK_SIDECAR_SECRET is set. */
function sidecarHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const secret = process.env.HAULDESK_SIDECAR_SECRET
  if (secret) headers["X-Hauldesk-Secret"] = secret
  return headers
}

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

/**
 * Drive miles from the Go worker alone. Null when the worker is unset, down,
 * or answers nonsense — callers pick their own fallback (routing.ts puts this
 * at the top of the Suggest-miles ladder so the two ladders never drift).
 */
export async function goWorkerRouteMiles(origin: LatLng, dest: LatLng): Promise<number | null> {
  if (!GO_WORKER_URL) return null
  try {
    const res = await fetch(`${GO_WORKER_URL}/route/miles`, {
      method: "POST",
      headers: sidecarHeaders(),
      body: JSON.stringify({ origin, dest }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { miles?: number; source?: string }
    // The worker labels its OSRM-down floor "haversine-fallback"; treat that as
    // no answer so the ladder's own estimate (winding factor applied) runs.
    if (data.source && data.source !== "osrm") return null
    if (typeof data.miles === "number" && Number.isFinite(data.miles) && data.miles > 0) {
      return Math.round(data.miles)
    }
    return null
  } catch {
    return null
  }
}

/** Driving miles between two coordinates. Go worker → Mapbox → haversine fallback. */
export async function routeMiles(req: RouteMilesRequest): Promise<RouteMilesResult> {
  const workerMiles = await goWorkerRouteMiles(req.origin, req.dest)
  if (workerMiles != null) {
    return { miles: workerMiles, source: "go-worker" }
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
        headers: sidecarHeaders(),
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
