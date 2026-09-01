/**
 * mapbox.ts was previously untested. `NEXT_PUBLIC_MAPBOX_TOKEN`/`MAPBOX_TOKEN`
 * are read into a module-level const at import time, so every test that
 * varies the token must vi.resetModules() + vi.stubEnv() before a fresh
 * dynamic import (same pattern as sidecars.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGIN = { lat: 47.5, lng: -122.3 }
const DEST = { lat: 43.6, lng: -116.2 }

async function loadMapbox() {
  return import("../mapbox")
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("hasMapbox", () => {
  it("is false when no token env var is set", async () => {
    const { hasMapbox } = await loadMapbox()
    expect(hasMapbox()).toBe(false)
  })

  it("is true once NEXT_PUBLIC_MAPBOX_TOKEN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test")
    const { hasMapbox } = await loadMapbox()
    expect(hasMapbox()).toBe(true)
  })

  it("falls back to MAPBOX_TOKEN when NEXT_PUBLIC_MAPBOX_TOKEN is unset", async () => {
    vi.stubEnv("MAPBOX_TOKEN", "pk.server-only")
    const { hasMapbox } = await loadMapbox()
    expect(hasMapbox()).toBe(true)
  })
})

describe("drivingMiles", () => {
  it("returns null without a token — never calls fetch", async () => {
    const { drivingMiles } = await loadMapbox()
    const result = await drivingMiles(ORIGIN, DEST)
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns rounded driving miles on a successful response", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test")
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ distance: 402336 }] }), // 250.0 miles in meters
    } as Response)

    const { drivingMiles } = await loadMapbox()
    const result = await drivingMiles(ORIGIN, DEST)

    expect(result).toBe(250)
    expect(fetch).toHaveBeenCalledTimes(1)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain("access_token=pk.test")
    expect(url).toContain(`${ORIGIN.lng},${ORIGIN.lat};${DEST.lng},${DEST.lat}`)
  })

  it("returns null on a non-2xx response", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test")
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const { drivingMiles } = await loadMapbox()
    await expect(drivingMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("returns null when the response has no route", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test")
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    } as Response)

    const { drivingMiles } = await loadMapbox()
    await expect(drivingMiles(ORIGIN, DEST)).resolves.toBeNull()
  })

  it("returns null when fetch throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test")
    vi.mocked(fetch).mockRejectedValue(new Error("network down"))

    const { drivingMiles } = await loadMapbox()
    await expect(drivingMiles(ORIGIN, DEST)).resolves.toBeNull()
  })
})
