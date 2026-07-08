/**
 * TS gateway to the Go/Rust sidecars — was previously untested (see
 * 080d095's Backlog). `GO_WORKER_URL` / `RUST_COMPUTE_URL` are read into
 * module-level consts at import time, so every test that varies the env
 * must vi.resetModules() + vi.stubEnv() before a fresh dynamic import.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const drivingMilesMock = vi.hoisted(() => vi.fn(async (): Promise<number | null> => null))

vi.mock("../mapbox", () => ({
  drivingMiles: drivingMilesMock,
}))

const ORIGIN = { lat: 47.5, lng: -122.3 }
const DEST = { lat: 43.6, lng: -116.2 }

async function loadSidecars() {
  return import("../sidecars")
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  drivingMilesMock.mockReset()
  drivingMilesMock.mockResolvedValue(null)
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("hasGoWorker / hasRustCompute", () => {
  it("are false when the sidecar URLs are unset (Vercel prod default)", async () => {
    const { hasGoWorker, hasRustCompute } = await loadSidecars()
    expect(hasGoWorker()).toBe(false)
    expect(hasRustCompute()).toBe(false)
  })

  it("are true once the corresponding URL env var is set", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    const { hasGoWorker, hasRustCompute } = await loadSidecars()
    expect(hasGoWorker()).toBe(true)
    expect(hasRustCompute()).toBe(true)
  })
})

describe("goWorkerRouteMiles", () => {
  it("returns null without calling fetch when the worker URL is unset", async () => {
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns rounded miles when the worker answers with source osrm", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ miles: 412.6, source: "osrm" }) }))
    )
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBe(413)
  })

  it("treats the worker's own haversine-fallback label as no answer, so the ladder's winding-factor estimate runs instead", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ miles: 400, source: "haversine-fallback" }) }))
    )
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("returns null on a non-OK response", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("returns null when fetch throws (worker down / network error)", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED")
      })
    )
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it.each([0, -5, Number.NaN, undefined])("returns null for a non-positive/invalid miles value (%s)", async (miles) => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ miles, source: "osrm" }) }))
    )
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("sends the shared-secret header when HAULDESK_SIDECAR_SECRET is set", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubEnv("HAULDESK_SIDECAR_SECRET", "shh")
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ miles: 100, source: "osrm" }) }))
    vi.stubGlobal("fetch", fetchMock)
    const { goWorkerRouteMiles } = await loadSidecars()
    await goWorkerRouteMiles(ORIGIN, DEST)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["X-Hauldesk-Secret"]).toBe("shh")
  })

  it("omits the secret header when HAULDESK_SIDECAR_SECRET is unset", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ miles: 100, source: "osrm" }) }))
    vi.stubGlobal("fetch", fetchMock)
    const { goWorkerRouteMiles } = await loadSidecars()
    await goWorkerRouteMiles(ORIGIN, DEST)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.headers as Record<string, string>).not.toHaveProperty("X-Hauldesk-Secret")
  })
})

describe("routeMiles fallback ladder (go-worker -> mapbox -> haversine)", () => {
  it("prefers the go worker when it answers, skipping mapbox entirely", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ miles: 400, source: "osrm" }) }))
    )
    const { routeMiles } = await loadSidecars()
    await expect(routeMiles({ origin: ORIGIN, dest: DEST })).resolves.toEqual({ miles: 400, source: "go-worker" })
    expect(drivingMilesMock).not.toHaveBeenCalled()
  })

  it("falls to mapbox when the go worker URL is unset", async () => {
    drivingMilesMock.mockResolvedValue(390)
    const { routeMiles } = await loadSidecars()
    await expect(routeMiles({ origin: ORIGIN, dest: DEST })).resolves.toEqual({ miles: 390, source: "mapbox" })
  })

  it("falls to mapbox when the go worker is set but errors", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    drivingMilesMock.mockResolvedValue(390)
    const { routeMiles } = await loadSidecars()
    await expect(routeMiles({ origin: ORIGIN, dest: DEST })).resolves.toEqual({ miles: 390, source: "mapbox" })
  })

  it("falls all the way to haversine when neither the go worker nor mapbox answer", async () => {
    drivingMilesMock.mockResolvedValue(null)
    const { routeMiles } = await loadSidecars()
    const result = await routeMiles({ origin: ORIGIN, dest: DEST })
    expect(result.source).toBe("haversine")
    expect(result.miles).toBeGreaterThan(0)
  })
})

describe("iftaSummary", () => {
  const INPUTS = {
    milesByJurisdiction: { WA: 500, ID: 200 },
    gallonsByJurisdiction: { WA: 80, ID: 20 },
    rates: { WA: { rate: 0.494 }, ID: { rate: 0.32 } },
  }

  it("uses the typescript computeIfta fallback when the rust URL is unset", async () => {
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result.source).toBe("typescript")
    expect(result.fleetMiles).toBe(700)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("prefers rust-compute when the sidecar answers OK", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    const rustResult = { fleetMiles: 700, fleetGallons: 100, mpg: 7, rows: [], netTaxCents: 1234, missingRates: [] }
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => rustResult })))
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result).toEqual({ ...rustResult, source: "rust-compute" })
  })

  it("falls back to typescript when the rust sidecar is set but errors", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result.source).toBe("typescript")
    expect(result.fleetMiles).toBe(700)
  })

  it("falls back to typescript when the rust sidecar throws (network error)", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED")
      })
    )
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result.source).toBe("typescript")
  })
})
