import { describe, expect, it } from "vitest"
import { normalizeTruckerCloudHos, normalizeTruckerCloudVehicle } from "../telematics"

describe("TruckerCloud vehicle row normalization", () => {
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
