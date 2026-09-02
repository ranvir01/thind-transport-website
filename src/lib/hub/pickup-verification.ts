/**
 * Pickup verification — the double-brokering countermeasure, pure half.
 *
 * The fraud this guards against: a load is booked to Thind, a stranger's truck
 * shows up at the shipper with the pickup number, and the freight is gone.
 * The countermeasure is evidence at the dock, at the moment of arrival: the
 * driver on the dispatch is the one who tapped, the device was at the shipper,
 * and there is a photo of the truck. The customer-side mirror of this is
 * vetting-shared.ts's DOUBLE_BROKER_CHECKLIST.
 *
 * Decisions, both deliberate:
 *  - A mismatch ALERTS the office; it never blocks the driver. GPS drifts at
 *    docks and inside metal buildings, and stopping an arrival from recording
 *    would cost real detention money to guard against a rare fraud.
 *  - "unverified" is a shrug, not a verdict. No GPS permission or an offline
 *    driver is the usual case; only a positive driver/location FAILURE is a
 *    mismatch. A stop with no coordinates cannot produce a mismatch at all.
 */
import { greatCircleMiles } from "./eta"

/** Within this many miles of the stop's geocode counts as "at the shipper". */
export const GEOFENCE_MILES = 1

export type PickupCheckKey = "driver" | "location" | "window" | "photo"
export type PickupResult = "verified" | "mismatch" | "unverified"

export interface PickupCheck {
  key: PickupCheckKey
  label: string
  /** true = passed, false = failed, null = could not be evaluated. */
  ok: boolean | null
  detail: string
}

/** Office copy for each check, in the order they render. Exported so a test pins the wording. */
export const PICKUP_CHECKS: Record<PickupCheckKey, string> = {
  driver: "Driver on the dispatch is the one who arrived",
  location: `Device was within ${GEOFENCE_MILES} mi of the shipper`,
  window: "Arrived inside the appointment window",
  photo: "Photo of the truck at the dock",
}

export interface PickupInput {
  /** The driver whose session submitted the verification. */
  sessionDriverId: string
  /** The driver the load was dispatched to. Null = unassigned load. */
  loadDriverId: string | null
  /** Device fix at submission. Null = no permission / no fix. */
  fix: { lat: number; lng: number } | null
  /** The pickup stop's geocode. Null lat/lng = never geocoded. */
  stop: {
    lat: number | null
    lng: number | null
    appt_start: string | null
    appt_end: string | null
    fcfs: boolean
  }
  arrivedAt: string | Date
  hasPhoto: boolean
}

export interface PickupEvaluation {
  result: PickupResult
  distanceMiles: number | null
  checks: PickupCheck[]
}

export function evaluatePickup(input: PickupInput): PickupEvaluation {
  const checks: PickupCheck[] = []

  // driver
  const driverOk = input.loadDriverId == null ? null : input.loadDriverId === input.sessionDriverId
  checks.push({
    key: "driver",
    label: PICKUP_CHECKS.driver,
    ok: driverOk,
    detail:
      driverOk == null
        ? "Load has no driver assigned"
        : driverOk
          ? "Matches the dispatch"
          : "A different driver than the one dispatched",
  })

  // location
  let distanceMiles: number | null = null
  let locationOk: boolean | null = null
  let locationDetail = "No device location"
  if (input.stop.lat == null || input.stop.lng == null) {
    locationDetail = "Stop was never geocoded — cannot check"
  } else if (input.fix) {
    distanceMiles = Math.round(greatCircleMiles(input.fix.lat, input.fix.lng, input.stop.lat, input.stop.lng) * 10) / 10
    locationOk = distanceMiles <= GEOFENCE_MILES
    locationDetail = `${distanceMiles} mi from the stop`
  }
  checks.push({ key: "location", label: PICKUP_CHECKS.location, ok: locationOk, detail: locationDetail })

  // window
  const arrived = input.arrivedAt instanceof Date ? input.arrivedAt : new Date(input.arrivedAt)
  const start = input.stop.appt_start ? new Date(input.stop.appt_start) : null
  const end = input.stop.appt_end ? new Date(input.stop.appt_end) : null
  let windowOk: boolean | null
  let windowDetail: string
  if (input.stop.fcfs || (!start && !end)) {
    windowOk = true
    windowDetail = "First come, first served"
  } else if (Number.isNaN(arrived.getTime())) {
    windowOk = null
    windowDetail = "Arrival time unreadable"
  } else {
    const afterStart = !start || arrived.getTime() >= start.getTime()
    const beforeEnd = !end || arrived.getTime() <= end.getTime()
    windowOk = afterStart && beforeEnd
    windowDetail = windowOk ? "On time" : afterStart ? "After the window closed" : "Before the window opened"
  }
  checks.push({ key: "window", label: PICKUP_CHECKS.window, ok: windowOk, detail: windowDetail })

  // photo
  checks.push({
    key: "photo",
    label: PICKUP_CHECKS.photo,
    ok: input.hasPhoto,
    detail: input.hasPhoto ? "Attached" : "No photo",
  })

  // Only a positive driver or location FAILURE is a mismatch. The window is
  // advisory — being late is a detention conversation, not a fraud signal.
  const result: PickupResult =
    driverOk === false || locationOk === false
      ? "mismatch"
      : driverOk === true && locationOk === true && input.hasPhoto
        ? "verified"
        : "unverified"

  return { result, distanceMiles, checks }
}

/** Short pill copy for the office. Null for "unverified" — the load detail shows nothing rather than a shrug. */
export function pickupPillLabel(result: PickupResult, distanceMiles: number | null): string | null {
  const dist = distanceMiles == null ? "" : ` · ${distanceMiles} mi from dock`
  if (result === "verified") return `Pickup verified${dist}`
  if (result === "mismatch") return `Pickup mismatch${dist}`
  return null
}
