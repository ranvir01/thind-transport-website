/**
 * TruckerCloud — the drop-in second TelematicsSource this file's header
 * comment promised since Terminal shipped. Same contract shape as
 * efs.test.ts: pure normalizers tested without a live feed, the adapter
 * tested against a mocked fetch (OAuth2 client-credentials token exchange,
 * then the actual feed request), and the provider-selection logic
 * (activeTelematicsSource, exercised indirectly through runTelematicsSync)
 * that lets a carrier connect either aggregator and get the same sync.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async (carrierId: string, provider: string) => {
    if (provider === "terminal") return { apiKey: "term-key", connectionToken: "term-token" }
    if (provider === "truckercloud") return { clientId: "tc-id", clientSecret: "tc-secret" }
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

/** Mocks the two-call OAuth2 flow: POST /oauth/token, then the feed request. */
function mockTokenThenFeed(feedJson: unknown, feedOk = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/oauth/token")) {
        return { ok: true, json: async () => ({ access_token: "tok" }) }
      }
      return { ok: feedOk, status: 503, json: async () => feedJson }
    })
  )
}

describe("normalizeTruckerCloudVehicle / normalizeTruckerCloudHos (pure)", () => {
  it("maps the documented feed shape into TelematicsVehicle fields", () => {
    const vehicle = normalizeTruckerCloudVehicle({
      assetId: "ASSET-77",
      unitNumber: "T-104",
      lastLocation: { lat: 41.31, lng: -105.59, odometer: 214830, timestamp: "2026-07-01T14:30:00Z" },
    })
    expect(vehicle).toEqual({
      externalId: "ASSET-77",
      unitHint: "T-104",
      lat: 41.31,
      lng: -105.59,
      odometerMiles: 214830,
      locatedAt: "2026-07-01T14:30:00Z",
    })
  })

  it("falls back safely when location or unit hint is missing", () => {
    const vehicle = normalizeTruckerCloudVehicle({ assetId: "ASSET-1" })
    expect(vehicle.unitHint).toBeNull()
    expect(vehicle.lat).toBeNull()
    expect(vehicle.lng).toBeNull()
    expect(vehicle.odometerMiles).toBeNull()
    expect(vehicle.locatedAt).toBeNull()
  })
})

describe("TruckerCloud HOS row normalization", () => {
  it("maps the documented feed shape and converts seconds to minutes", () => {
    const hos = normalizeTruckerCloudHos({
      driverId: "DRV-9",
      driverName: "Jasbir Singh",
      status: "driving",
      driveTimeRemainingSec: 3600,
      shiftTimeRemainingSec: 7200,
      cycleTimeRemainingSec: 18000,
      recordedAt: "2026-07-01T14:30:00Z",
    })
    expect(hos).toEqual({
      externalDriverId: "DRV-9",
      driverNameHint: "Jasbir Singh",
      dutyStatus: "driving",
      driveRemainingMinutes: 60,
      shiftRemainingMinutes: 120,
      cycleRemainingMinutes: 300,
      ts: "2026-07-01T14:30:00Z",
    })
  })

  it("falls back safely when timers are missing", () => {
    const hos = normalizeTruckerCloudHos({ driverId: "DRV-2" })
    expect(hos.driverNameHint).toBeNull()
    expect(hos.dutyStatus).toBeNull()
    expect(hos.driveRemainingMinutes).toBeNull()
    expect(hos.shiftRemainingMinutes).toBeNull()
    expect(hos.cycleRemainingMinutes).toBeNull()
  })
})

describe("truckerCloudSource (TelematicsSource contract)", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
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

  it("pulls and normalizes vehicles once the token exchange and feed both resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ clientId: "tc-id", clientSecret: "tc-secret" })
    mockTokenThenFeed({ vehicles: [{ assetId: "veh-1", unitNumber: "104", lastLocation: { lat: 1, lng: 2 } }] })
    const source = truckerCloudSource(CARRIER)
    const vehicles = await source.vehicles()
    expect(vehicles.map((v) => v.externalId)).toEqual(["veh-1"])
  })

  it("surfaces a non-OK feed response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ clientId: "tc-id", clientSecret: "tc-secret" })
    mockTokenThenFeed({}, false)
    const source = truckerCloudSource(CARRIER)
    await expect(source.vehicles()).rejects.toThrow(/503/)
  })

  it("refuses to fetch a token without both clientId and clientSecret", async () => {
    getCredentialsMock.mockResolvedValue({ clientId: "tc-id" })
    const source = truckerCloudSource(CARRIER)
    await expect(source.vehicles()).rejects.toThrow(/not connected/)
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
      if (provider === "truckercloud") return { clientId: "tc-id", clientSecret: "tc-secret" }
      return null
    })
    mockTokenThenFeed({ data: [] })
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
