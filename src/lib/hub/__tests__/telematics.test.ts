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

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async (carrierId: string, provider: string) => {
    if (provider === "terminal") return { apiKey: "term-key", connectionToken: "term-token" }
    if (provider === "truckercloud") return { clientId: "tc-id", clientSecret: "tc-secret" }
    return null
  }),
  hasCredentials: vi.fn(async () => false),
}))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))

import { query, queryOne } from "../db"
import { getCredentials, hasCredentials } from "../credentials"
import { notifyRoles } from "../notify"
import {
  fleetHosStatus, hosLegalityWarning, hosLevel, normalizeTruckerCloudVehicle, normalizeTruckerCloudHos,
  runHosViolationAlerts, runTelematicsSync, terminalSource, truckerCloudSource,
} from "../telematics"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const notifyRolesMock = vi.mocked(notifyRoles)
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

describe("terminalSource (TelematicsSource contract)", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and refuses to fetch on partial credentials", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue({ apiKey: "term-key" }) // no connectionToken
    const source = terminalSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.vehicles()).rejects.toThrow(/not connected/)
    await expect(source.hos()).rejects.toThrow(/not connected/)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("sends both auth headers and normalizes the vehicles feed (latestLocation expanded)", async () => {
    getCredentialsMock.mockResolvedValue({ apiKey: "term-key", connectionToken: "term-token" })
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 9001,
            name: "104",
            latestLocation: { latitude: 47.38, longitude: -122.23, odometer: 187654, locatedAt: "2026-07-01T14:30:00Z" },
          },
          { id: "veh-2", licensePlate: "WA-TRK-2" }, // no name, no location yet
        ],
      }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const vehicles = await terminalSource(CARRIER).vehicles()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/vehicles?expand=latestLocation"),
      expect.objectContaining({
        headers: { Authorization: "Bearer term-key", "Connection-Token": "term-token" },
      })
    )
    expect(vehicles).toEqual([
      { externalId: "9001", unitHint: "104", lat: 47.38, lng: -122.23, odometerMiles: 187654, locatedAt: "2026-07-01T14:30:00Z" },
      { externalId: "veh-2", unitHint: "WA-TRK-2", lat: null, lng: null, odometerMiles: null, locatedAt: null },
    ])
  })

  it("normalizes the HOS feed, converting remaining-time seconds to minutes", async () => {
    getCredentialsMock.mockResolvedValue({ apiKey: "term-key", connectionToken: "term-token" })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            driverId: "drv-7", driverName: "Jasbir Singh", dutyStatus: "driving",
            driveRemaining: 5430, shiftRemaining: 7200, cycleRemaining: "not-a-number",
            updatedAt: "2026-07-01T14:30:00Z",
          },
        ],
      }),
    })))

    const hos = await terminalSource(CARRIER).hos()
    expect(hos).toEqual([
      {
        externalDriverId: "drv-7",
        driverNameHint: "Jasbir Singh",
        dutyStatus: "driving",
        driveRemainingMinutes: 91, // 5430s rounds to 91min, proving seconds→minutes
        shiftRemainingMinutes: 120,
        cycleRemainingMinutes: null, // non-numeric timer refused, not coerced
        ts: "2026-07-01T14:30:00Z",
      },
    ])
  })

  it("surfaces a non-OK response as an error naming the path and status", async () => {
    getCredentialsMock.mockResolvedValue({ apiKey: "term-key", connectionToken: "term-token" })
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })))
    await expect(terminalSource(CARRIER).vehicles()).rejects.toThrow(/\/vehicles.*401/)
  })
})

describe("truckerCloudSource token + HOS edge paths", () => {
  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    getCredentialsMock.mockResolvedValue({ clientId: "tc-id", clientSecret: "tc-secret" })
  })

  it("pulls and normalizes the HOS feed from the logs envelope", async () => {
    mockTokenThenFeed({ logs: [{ driverId: "DRV-3", status: "on_duty", driveTimeRemainingSec: 600 }] })
    const hos = await truckerCloudSource(CARRIER).hos()
    expect(hos.map((h) => [h.externalDriverId, h.dutyStatus, h.driveRemainingMinutes])).toEqual([
      ["DRV-3", "on_duty", 10],
    ])
  })

  it("surfaces a failed token exchange instead of calling the feed unauthenticated", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(truckerCloudSource(CARRIER).vehicles()).rejects.toThrow(/token.*401/)
    expect(fetchMock).toHaveBeenCalledTimes(1) // only the token call, never the feed
  })

  it("rejects a token response that lacks access_token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    await expect(truckerCloudSource(CARRIER).vehicles()).rejects.toThrow(/missing access_token/)
  })
})

describe("runTelematicsSync matching + persistence", () => {
  const TRUCKS = [
    { id: "truck-a", unit_number: "104" },
    { id: "truck-b", unit_number: "T-9" },
  ]
  const DRIVERS = [{ id: "driver-a", full_name: "jasbir singh" }]
  const inserts = () =>
    queryMock.mock.calls.filter(([sql]) => (sql as string).includes("INSERT INTO"))

  beforeEach(() => {
    hasCredentialsMock.mockReset()
    getCredentialsMock.mockReset()
    queryMock.mockReset()
    // Terminal is the connected aggregator for these tests.
    hasCredentialsMock.mockImplementation(async (_c: string, provider: string) => provider === "terminal")
    getCredentialsMock.mockResolvedValue({ apiKey: "term-key", connectionToken: "term-token" })
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.trucks")) return TRUCKS
      if (sql.includes("FROM hub.drivers")) return DRIVERS
      return []
    })
  })

  function stubTerminalFeeds(vehicles: unknown[], hos: unknown[]) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ data: url.includes("/vehicles") ? vehicles : hos }),
    })))
  }

  it("matches units case-insensitively, writes carrier-scoped pings tagged with the provider, and reports unmatched hints", async () => {
    stubTerminalFeeds(
      [
        { id: "v1", name: "t-9", latestLocation: { latitude: 47.1, longitude: -122.2, odometer: 50000, locatedAt: "2026-07-01T10:00:00Z" } },
        { id: "v2", name: "999", latestLocation: { latitude: 1, longitude: 2 } }, // unit not in fleet
        { id: "v3", latestLocation: { latitude: 3, longitude: 4 } }, // no unit hint at all
      ],
      []
    )
    const result = await runTelematicsSync(CARRIER)
    expect(result).toEqual({ connected: true, pings: 1, hos: 0, unmatched: ["999"] })

    const pingInserts = inserts().filter(([sql]) => (sql as string).includes("position_pings"))
    expect(pingInserts).toHaveLength(1)
    expect(pingInserts[0][1]).toEqual([
      CARRIER, "truck-b", "2026-07-01T10:00:00Z", 47.1, -122.2, 50000, "terminal",
    ])
  })

  it("skips a matched vehicle without coordinates rather than inserting a null ping", async () => {
    stubTerminalFeeds([{ id: "v1", name: "104", latestLocation: { odometer: 12345 } }], [])
    const result = await runTelematicsSync(CARRIER)
    expect(result.pings).toBe(0)
    expect(result.unmatched).toEqual([])
    expect(inserts()).toHaveLength(0)
  })

  it("matches HOS snapshots by driver-name hint (case-insensitive) and skips unknown drivers", async () => {
    stubTerminalFeeds(
      [],
      [
        { driverId: "d1", driverName: "JASBIR SINGH", dutyStatus: "driving", driveRemaining: 3600, updatedAt: "2026-07-01T11:00:00Z" },
        { driverId: "d2", driverName: "Nobody Here", dutyStatus: "off_duty", updatedAt: "2026-07-01T11:00:00Z" },
        { driverId: "d3", updatedAt: "2026-07-01T11:00:00Z" }, // no name hint
      ]
    )
    const result = await runTelematicsSync(CARRIER)
    expect(result.hos).toBe(1)

    const hosInserts = inserts().filter(([sql]) => (sql as string).includes("hos_snapshots"))
    expect(hosInserts).toHaveLength(1)
    expect(hosInserts[0][1]).toEqual([
      CARRIER, "driver-a", "2026-07-01T11:00:00Z", "driving", 60, null, null, "terminal",
    ])
  })
})

describe("hosLegalityWarning (dispatch-legality estimate)", () => {
  beforeEach(() => {
    queryOneMock.mockReset()
  })

  it("stays silent when there is no HOS snapshot for the driver", async () => {
    queryOneMock.mockResolvedValue(null)
    await expect(hosLegalityWarning(CARRIER, "driver-a", 6)).resolves.toBeNull()
  })

  it("stays silent when the latest snapshot has no drive-remaining value", async () => {
    queryOneMock.mockResolvedValue({ drive_remaining_minutes: null, ts: "2026-07-01T11:00:00Z" })
    await expect(hosLegalityWarning(CARRIER, "driver-a", 6)).resolves.toBeNull()
  })

  it("stays silent when the remaining drive clock covers the ETA", async () => {
    queryOneMock.mockResolvedValue({ drive_remaining_minutes: 480, ts: "2026-07-01T11:00:00Z" })
    await expect(hosLegalityWarning(CARRIER, "driver-a", 7.5)).resolves.toBeNull()
  })

  it("warns — clearly labeled an estimate — when the ETA exceeds the remaining clock", async () => {
    queryOneMock.mockResolvedValue({ drive_remaining_minutes: 90, ts: "2026-07-01T11:00:00Z" })
    const warning = await hosLegalityWarning(CARRIER, "driver-a", 4)
    expect(warning).toMatch(/~4\.0h of driving/)
    expect(warning).toMatch(/~1\.5h left/)
    expect(warning).toMatch(/estimate only.*ELD is authoritative/)
  })
})

describe("hosLevel (bucketing)", () => {
  const FRESH = "2026-07-01T12:00:00Z"
  const now = new Date(FRESH).getTime()

  it("is stale when there is no drive-remaining value", () => {
    expect(hosLevel(null, FRESH, now)).toBe("stale")
  })

  it("is stale when the snapshot is older than 24h, even with minutes left", () => {
    const old = new Date(now - 25 * 3600000).toISOString()
    expect(hosLevel(480, old, now)).toBe("stale")
  })

  it("is violation at zero or negative remaining minutes", () => {
    expect(hosLevel(0, FRESH, now)).toBe("violation")
    expect(hosLevel(-10, FRESH, now)).toBe("violation")
  })

  it("is critical under the 60-minute threshold", () => {
    expect(hosLevel(60, FRESH, now)).toBe("critical")
    expect(hosLevel(1, FRESH, now)).toBe("critical")
  })

  it("is warning between 60 and 120 minutes", () => {
    expect(hosLevel(120, FRESH, now)).toBe("warning")
    expect(hosLevel(61, FRESH, now)).toBe("warning")
  })

  it("is ok above 120 minutes and fresh", () => {
    expect(hosLevel(480, FRESH, now)).toBe("ok")
  })
})

describe("fleetHosStatus", () => {
  beforeEach(() => queryMock.mockReset())

  it("maps rows and sorts by severity then name", async () => {
    queryMock.mockResolvedValue([
      { driver_id: "d-ok", full_name: "Zed Driver", duty_status: "driving", drive_remaining_minutes: 480, shift_remaining_minutes: 600, cycle_remaining_minutes: 3000, ts: new Date().toISOString() },
      { driver_id: "d-violation", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: 0, shift_remaining_minutes: 0, cycle_remaining_minutes: 100, ts: new Date().toISOString() },
      { driver_id: "d-critical", full_name: "Bo Driver", duty_status: "driving", drive_remaining_minutes: 30, shift_remaining_minutes: 200, cycle_remaining_minutes: 500, ts: new Date().toISOString() },
    ])
    const statuses = await fleetHosStatus(CARRIER)
    expect(statuses.map((s) => s.level)).toEqual(["violation", "critical", "ok"])
    expect(statuses.map((s) => s.driverId)).toEqual(["d-violation", "d-critical", "d-ok"])
  })

  it("returns an empty board when no telematics data exists", async () => {
    queryMock.mockResolvedValue([])
    await expect(fleetHosStatus(CARRIER)).resolves.toEqual([])
  })

  it("guards tenancy on both sides of the drivers join, not just hos_snapshots", async () => {
    queryMock.mockResolvedValue([])
    await fleetHosStatus(CARRIER)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("JOIN hub.drivers d ON d.id = h.driver_id AND d.carrier_id = h.carrier_id")
  })

  it("marks provider numbers as coming from the ELD", async () => {
    queryMock.mockResolvedValue([
      { driver_id: "d-1", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: 300, shift_remaining_minutes: 400, cycle_remaining_minutes: 3000, ts: new Date().toISOString() },
    ])
    expect((await fleetHosStatus(CARRIER))[0].source).toBe("eld")
  })

  describe("computed fallback when the provider's numbers are unusable", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

    /** Latest-snapshot query first, then the duty-log query for stale drivers. */
    const mockQueries = (latest: unknown[], history: unknown[]) => {
      queryMock.mockImplementation(async (sql: string) =>
        String(sql).includes("DISTINCT ON") ? latest : history
      )
    }

    it("computes the clocks from the duty log instead of showing a stale shrug", async () => {
      // The provider stopped sending remaining-minutes, but the duty statuses
      // kept arriving: 10 hours off, then 4 hours driving.
      mockQueries(
        [{ driver_id: "d-1", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: null, shift_remaining_minutes: null, cycle_remaining_minutes: null, ts: hoursAgo(1) }],
        [
          { driver_id: "d-1", ts: hoursAgo(15), duty_status: "offDuty" },
          { driver_id: "d-1", ts: hoursAgo(4), duty_status: "driving" },
        ]
      )
      const [status] = await fleetHosStatus(CARRIER)
      expect(status.source).toBe("computed")
      expect(status.level).not.toBe("stale")
      // 11 hours of driving less the 4 already driven.
      expect(status.driveRemainingMinutes).toBe(7 * 60)
      expect(status.shiftRemainingMinutes).toBe(10 * 60)
    })

    it("scopes the duty-log query to the carrier", async () => {
      mockQueries(
        [{ driver_id: "d-1", full_name: "Amy Driver", duty_status: null, drive_remaining_minutes: null, shift_remaining_minutes: null, cycle_remaining_minutes: null, ts: hoursAgo(1) }],
        []
      )
      await fleetHosStatus(CARRIER)
      const historyCall = queryMock.mock.calls.find(([sql]) => !String(sql).includes("DISTINCT ON"))!
      expect(String(historyCall[0])).toContain("WHERE carrier_id = $1")
      expect((historyCall[1] as unknown[])[0]).toBe(CARRIER)
    })

    it("stays stale rather than inventing hours when the log has no qualifying break", async () => {
      // Driving with no 10-hour break anywhere in the log: computeHos would
      // report a full clock it cannot actually vouch for.
      mockQueries(
        [{ driver_id: "d-1", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: null, shift_remaining_minutes: null, cycle_remaining_minutes: null, ts: hoursAgo(1) }],
        [{ driver_id: "d-1", ts: hoursAgo(3), duty_status: "driving" }]
      )
      const [status] = await fleetHosStatus(CARRIER)
      expect(status.level).toBe("stale")
      expect(status.source).toBe("eld")
      expect(status.driveRemainingMinutes).toBeNull()
    })

    it("skips the extra query entirely when every driver's feed is fresh", async () => {
      queryMock.mockResolvedValue([
        { driver_id: "d-1", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: 300, shift_remaining_minutes: 400, cycle_remaining_minutes: 3000, ts: new Date().toISOString() },
      ])
      await fleetHosStatus(CARRIER)
      expect(queryMock).toHaveBeenCalledTimes(1)
    })
  })
})

describe("runHosViolationAlerts", () => {
  beforeEach(() => {
    queryMock.mockReset()
    notifyRolesMock.mockClear()
  })

  it("notifies dispatcher/owner once per driver in violation or critical, not warning/ok", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("FROM hub.hos_snapshots")
        ? [
            { driver_id: "d-violation", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: 0, shift_remaining_minutes: 0, cycle_remaining_minutes: 100, ts: new Date().toISOString() },
            { driver_id: "d-warning", full_name: "Cy Driver", duty_status: "driving", drive_remaining_minutes: 90, shift_remaining_minutes: 300, cycle_remaining_minutes: 900, ts: new Date().toISOString() },
          ]
        : [] // no prior alert found
    )
    const result = await runHosViolationAlerts(CARRIER)
    expect(result).toEqual({ checked: 1, alerted: 1 })
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER, ["dispatcher", "owner"],
      expect.objectContaining({ kind: "hos_violation", link: "/hub/drivers/d-violation" })
    )
  })

  it("skips a driver already alerted within the cooldown window", async () => {
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("FROM hub.hos_snapshots")
        ? [{ driver_id: "d-violation", full_name: "Amy Driver", duty_status: "driving", drive_remaining_minutes: 0, shift_remaining_minutes: 0, cycle_remaining_minutes: 100, ts: new Date().toISOString() }]
        : [{ "?column?": 1 }] // already alerted recently
    )
    const result = await runHosViolationAlerts(CARRIER)
    expect(result).toEqual({ checked: 1, alerted: 0 })
    expect(notifyRolesMock).not.toHaveBeenCalled()
  })
})
