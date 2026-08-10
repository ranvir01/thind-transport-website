import { describe, expect, it } from "vitest"
import { isDemoEmail } from "../demo"
import { OFFICE_ROLES, HUB_ROLES } from "../types"
import {
  SANDBOX_CARRIER_ID,
  SANDBOX_SCENARIOS,
  SANDBOX_SEATS,
  SANDBOX_TOURS,
  isSandboxCarrier,
  sandboxSeat,
  seatForEmail,
} from "../sandbox"

describe("sandbox seats", () => {
  it("offers nine playable seats", () => {
    expect(SANDBOX_SEATS).toHaveLength(9)
  })

  it("keys and emails are unique", () => {
    expect(new Set(SANDBOX_SEATS.map((s) => s.key)).size).toBe(SANDBOX_SEATS.length)
    expect(new Set(SANDBOX_SEATS.map((s) => s.email)).size).toBe(SANDBOX_SEATS.length)
  })

  it("every seat rides a real role", () => {
    for (const seat of SANDBOX_SEATS) {
      expect(HUB_ROLES).toContain(seat.role)
      expect(seat.role).not.toBe("platform_admin")
    }
  })

  it("every seat login is covered by the HUB_DEMO_LOGIN kill switch", () => {
    for (const seat of SANDBOX_SEATS) {
      expect(isDemoEmail(seat.email)).toBe(true)
    }
  })

  it("entry paths land on surfaces the seat's role can actually reach", () => {
    for (const seat of SANDBOX_SEATS) {
      if (seat.role === "driver") expect(seat.entry).toBe("/hub/driver")
      else if (seat.role === "broker" || seat.role === "shipper") expect(seat.entry).toBe("/hub/portal")
      else {
        expect(OFFICE_ROLES).toContain(seat.role)
        expect(seat.entry.startsWith("/hub")).toBe(true)
        expect(seat.entry.startsWith("/hub/driver")).toBe(false)
        expect(seat.entry.startsWith("/hub/portal")).toBe(false)
      }
    }
  })

  it("covers office, road, and outside perspectives", () => {
    const groups = new Set(SANDBOX_SEATS.map((s) => s.group))
    expect(groups).toEqual(new Set(["office", "road", "outside"]))
    // Both pay models are playable from the driver's chair.
    const drivers = SANDBOX_SEATS.filter((s) => s.role === "driver")
    expect(drivers).toHaveLength(2)
  })

  it("isSandboxCarrier matches only the sandbox tenant", () => {
    expect(isSandboxCarrier(SANDBOX_CARRIER_ID)).toBe(true)
    expect(isSandboxCarrier("11111111-1111-1111-1111-111111111111")).toBe(false)
    expect(isSandboxCarrier(null)).toBe(false)
  })

  it("sandboxSeat looks up by key", () => {
    expect(sandboxSeat("owner")?.role).toBe("owner")
    expect(sandboxSeat("nope")).toBeUndefined()
  })

  it("seatForEmail resolves seats case-insensitively and rejects strangers", () => {
    expect(seatForEmail("SANDBOX.OWNER@demo.thind")?.key).toBe("owner")
    expect(seatForEmail("owner@demo.thind")).toBeUndefined()
    expect(seatForEmail(null)).toBeUndefined()
  })
})

describe("sandbox tours", () => {
  it("every seat has a three-step tour", () => {
    for (const seat of SANDBOX_SEATS) {
      const tour = SANDBOX_TOURS[seat.key]
      expect(tour, `tour for ${seat.key}`).toBeDefined()
      expect(tour.length).toBe(3)
    }
  })

  it("tour steps stay inside the seat's own surface", () => {
    for (const seat of SANDBOX_SEATS) {
      for (const step of SANDBOX_TOURS[seat.key]) {
        if (seat.role === "driver") expect(step.href.startsWith("/hub/driver")).toBe(true)
        else if (seat.role === "broker" || seat.role === "shipper")
          expect(step.href.startsWith("/hub/portal")).toBe(true)
        else {
          expect(step.href.startsWith("/hub")).toBe(true)
          expect(step.href.startsWith("/hub/driver")).toBe(false)
          expect(step.href.startsWith("/hub/portal")).toBe(false)
        }
      }
    }
  })
})

describe("sandbox scenarios", () => {
  it("offers steady and crunch", () => {
    expect(SANDBOX_SCENARIOS.map((s) => s.key)).toEqual(["steady", "crunch"])
  })
})
