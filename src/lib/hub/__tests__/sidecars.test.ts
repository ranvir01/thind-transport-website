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

  // Gateway-side mirror of the Go worker's WGS84 range check: the worker
  // answers 400 for these anyway, so the fetch is a guaranteed-null round
  // trip. Cases match the worker's own rejection table (main_test.go), plus
  // NaN/Infinity, which JSON can't carry but a TS caller can.
  it.each([
    ["latitude beyond +90", { lat: 91, lng: 0 }, { lat: 0, lng: 1 }],
    ["latitude below -90", { lat: 0, lng: 0 }, { lat: -90.0001, lng: 1 }],
    ["longitude beyond 180", { lat: 0, lng: 180.5 }, { lat: 0, lng: 1 }],
    ["longitude below -180", { lat: 0, lng: 0 }, { lat: 0, lng: -181 }],
    ["NaN latitude", { lat: Number.NaN, lng: 0 }, { lat: 0, lng: 1 }],
    ["Infinity longitude", { lat: 0, lng: Number.POSITIVE_INFINITY }, { lat: 0, lng: 1 }],
  ])("returns null without calling fetch for out-of-range coordinates (%s)", async (_label, origin, dest) => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles(origin, dest)).resolves.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("still calls the worker for boundary coordinates (poles / date line)", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ miles: 100, source: "osrm" }) }))
    )
    const { goWorkerRouteMiles } = await loadSidecars()
    await expect(goWorkerRouteMiles({ lat: 90, lng: -180 }, { lat: -90, lng: 180 })).resolves.toBe(100)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("sends the shared-secret header when HAULDESK_SIDECAR_SECRET is set", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    vi.stubEnv("HAULDESK_SIDECAR_SECRET", "shh")
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => ({ ok: true, json: async () => ({ miles: 100, source: "osrm" }) }))
    vi.stubGlobal("fetch", fetchMock)
    const { goWorkerRouteMiles } = await loadSidecars()
    await goWorkerRouteMiles(ORIGIN, DEST)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["X-Hauldesk-Secret"]).toBe("shh")
  })

  it("omits the secret header when HAULDESK_SIDECAR_SECRET is unset", async () => {
    vi.stubEnv("HAULDESK_GO_WORKER_URL", "http://localhost:8090")
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => ({ ok: true, json: async () => ({ miles: 100, source: "osrm" }) }))
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

  it("accepts a rust reply with populated rows when every row carries finite cents", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    const row = {
      jurisdiction: "WA",
      miles: 500,
      taxableGallons: 71.429,
      taxPaidGallons: 80,
      rate: 0.494,
      surchargeRate: 0,
      taxCents: -423,
      surchargeCents: 0,
      netCents: -423,
    }
    const rustResult = { fleetMiles: 700, fleetGallons: 100, mpg: 7, rows: [row], netTaxCents: -423, missingRates: [] }
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => rustResult })))
    const { iftaSummary } = await loadSidecars()
    await expect(iftaSummary(INPUTS)).resolves.toEqual({ ...rustResult, source: "rust-compute" })
  })

  // A 200 with parseable JSON is not proof the reply is IFTA math — version
  // skew, a proxy error page, or the wrong service on that port must fall back
  // to TS rather than flow undefined/NaN cents into a filing.
  it.each([
    ["an error object", { error: "internal" }],
    ["a null body", null],
    ["a bare string", "ok"],
    ["netTaxCents as a string", { fleetMiles: 1, fleetGallons: 1, mpg: 1, rows: [], netTaxCents: "1234", missingRates: [] }],
    ["a missing netTaxCents", { fleetMiles: 1, fleetGallons: 1, mpg: 1, rows: [], missingRates: [] }],
    ["missingRates as a non-array", { fleetMiles: 1, fleetGallons: 1, mpg: 1, rows: [], netTaxCents: 0, missingRates: "WA" }],
    ["a row without netCents", { fleetMiles: 1, fleetGallons: 1, mpg: 1, rows: [{ jurisdiction: "WA" }], netTaxCents: 0, missingRates: [] }],
  ])("falls back to typescript when the rust sidecar answers 200 with %s", async (_label, body) => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => body })))
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result.source).toBe("typescript")
    expect(result.fleetMiles).toBe(700)
  })

  it("falls back to typescript when the rust reply is not valid JSON (json() throws)", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON")
        },
      }))
    )
    const { iftaSummary } = await loadSidecars()
    const result = await iftaSummary(INPUTS)
    expect(result.source).toBe("typescript")
    expect(result.fleetMiles).toBe(700)
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

  // Mirror of goWorkerRouteMiles's secret-header coverage above: iftaSummary
  // shares the same sidecarHeaders() helper, but nothing pinned that it
  // actually reaches the fetch call here — a refactor that dropped the
  // headers arg from this call site alone would pass every other test in
  // this file (the rust URL just needs to be set for the request to fire).
  it("sends the shared-secret header when HAULDESK_SIDECAR_SECRET is set", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    vi.stubEnv("HAULDESK_SIDECAR_SECRET", "shh")
    const rustResult = { fleetMiles: 700, fleetGallons: 100, mpg: 7, rows: [], netTaxCents: 1234, missingRates: [] }
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => ({ ok: true, json: async () => rustResult }))
    vi.stubGlobal("fetch", fetchMock)
    const { iftaSummary } = await loadSidecars()
    await iftaSummary(INPUTS)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["X-Hauldesk-Secret"]).toBe("shh")
  })

  it("omits the secret header when HAULDESK_SIDECAR_SECRET is unset", async () => {
    vi.stubEnv("HAULDESK_RUST_COMPUTE_URL", "http://localhost:8091")
    const rustResult = { fleetMiles: 700, fleetGallons: 100, mpg: 7, rows: [], netTaxCents: 1234, missingRates: [] }
    const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => ({ ok: true, json: async () => rustResult }))
    vi.stubGlobal("fetch", fetchMock)
    const { iftaSummary } = await loadSidecars()
    await iftaSummary(INPUTS)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.headers as Record<string, string>).not.toHaveProperty("X-Hauldesk-Secret")
  })
})
