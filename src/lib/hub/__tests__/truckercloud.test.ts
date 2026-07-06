/**
 * TruckerCloud — the drop-in second TelematicsSource this file's header
 * comment promised since Terminal shipped. Same contract shape as
 * efs.test.ts: pure normalizers tested without a live feed, the adapter
 * tested against a mocked fetch, and the provider-selection logic
 * (activeTelematicsSource, exercised indirectly through runTelematicsSync)
 * that lets a carrier connect either aggregator and get the same sync.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async (carrierId: string, provider: string) => {
    if (provider === "terminal") return { apiKey: "term-key", connectionToken: "term-token" }
    if (provider === "truckercloud") return { apiKey: "tc-key" }
    return null
  }),
  hasCredentials: vi.fn(async () => false),
}))

import { query } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import {
  normalizeTruckerCloudVehicle, normalizeTruckerCloudHos, runTelematicsSync, truckerCloudSource,
} from "../telematics"

const queryMock = vi.mocked(query)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("normalizeTruckerCloudVehicle / normalizeTruckerCloudHos (pure)", () => {
  it("maps the assumed vehicle shape into a TelematicsVehicle", () => {
    const v = normalizeTruckerCloudVehicle({
      vehicleId: "veh-1",
      unitNumber: "104",
      location: { lat: 41.3, lng: -105.5, odometer: 245102, timestamp: "2026-06-01T12:00:00Z" },
    })
    expect(v).toEqual({
      externalId: "veh-1",
      unitHint: "104",
      lat: 41.3,
      lng: -105.5,
      odometerMiles: 245102,
      locatedAt: "2026-06-01T12:00:00Z",
    })
  })

  it("degrades gracefully when location is missing", () => {
    const v = normalizeTruckerCloudVehicle({ vehicleId: "veh-2" })
    expect(v.unitHint).toBeNull()
    expect(v.lat).toBeNull()
    expect(v.lng).toBeNull()
    expect(v.odometerMiles).toBeNull()
  })

  it("maps the assumed HOS shape into a TelematicsHos, converting seconds to minutes", () => {
    const h = normalizeTruckerCloudHos({
      driverId: "drv-1",
      driverName: "Jane Doe",
      status: "driving",
      driveTimeRemainingSeconds: 3600,
      shiftTimeRemainingSeconds: 7200,
      cycleTimeRemainingSeconds: 18000,
      recordedAt: "2026-06-01T12:00:00Z",
    })
    expect(h).toEqual({
      externalDriverId: "drv-1",
      driverNameHint: "Jane Doe",
      dutyStatus: "driving",
      driveRemainingMinutes: 60,
      shiftRemainingMinutes: 120,
      cycleRemainingMinutes: 300,
      ts: "2026-06-01T12:00:00Z",
    })
  })
})

describe("truckerCloudSource (TelematicsSource contract)", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and vehicles()/hos() refuse instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = truckerCloudSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.vehicles()).rejects.toThrow(/not connected/)
    await expect(source.hos()).rejects.toThrow(/not connected/)
  })

  it("pulls and normalizes vehicles once credentials + feed both resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "tc-key" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [{ vehicleId: "veh-1", unitNumber: "104", location: { lat: 1, lng: 2 } }] }),
      }))
    )
    const source = truckerCloudSource(CARRIER)
    const vehicles = await source.vehicles()
    expect(vehicles.map((v) => v.externalId)).toEqual(["veh-1"])
  })

  it("surfaces a non-OK response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ apiKey: "tc-key" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = truckerCloudSource(CARRIER)
    await expect(source.vehicles()).rejects.toThrow(/503/)
  })
})

describe("runTelematicsSync provider selection", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    getCredentialsMock.mockReset()
    getCredentialsMock.mockImplementation(async (_carrierId: string, provider: string) => {
      if (provider === "terminal") return { apiKey: "term-key", connectionToken: "term-token" }
      if (provider === "truckercloud") return { apiKey: "tc-key" }
      return null
    })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })))
  })

  it("reports disconnected when neither Terminal nor TruckerCloud is connected", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await expect(runTelematicsSync(CARRIER)).resolves.toEqual({ connected: false })
  })

  it("falls back to TruckerCloud when Terminal isn't connected", async () => {
    hasCredentialsMock.mockImplementation(async (_carrierId: string, provider: string) => provider === "truckercloud")
    const result = await runTelematicsSync(CARRIER)
    expect(result.connected).toBe(true)
    // No vehicles/hos rows in the fixture, but reaching `connected: true` proves
    // activeTelematicsSource picked TruckerCloud rather than short-circuiting.
  })

  it("prefers Terminal when both are connected", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    const result = await runTelematicsSync(CARRIER)
    expect(result.connected).toBe(true)
    expect(getCredentialsMock).toHaveBeenCalledWith(CARRIER, "terminal")
    expect(getCredentialsMock).not.toHaveBeenCalledWith(CARRIER, "truckercloud")
  })
})
