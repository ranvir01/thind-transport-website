/**
 * Pure mileage-based PM due-status math — no DB import, so this is safe to
 * use from client components (MaintenancePanel) as well as the server-side
 * compliance wall (compliance.ts).
 */
export type DueColor = "red" | "amber" | "green"

/** Amber window for a mileage-based PM: 10% of the interval, floor 500mi —
 *  mirrors the 30-day amber window used for date-based items. */
export function mileageAmberThreshold(intervalMiles: number): number {
  return Math.max(500, Math.round(intervalMiles * 0.1))
}

export interface MileageStatus {
  color: DueColor | null
  milesRemaining: number | null
}

/** Miles-until-due for a PM schedule, or nulls when there isn't enough data
 *  (no mileage interval set, or no odometer reading known yet). */
export function mileageStatus(
  intervalMiles: number | null,
  currentOdometer: number | null | undefined,
  lastDoneOdometer: number | null
): MileageStatus {
  if (intervalMiles == null || currentOdometer == null || lastDoneOdometer == null) {
    return { color: null, milesRemaining: null }
  }
  const milesRemaining = intervalMiles - (currentOdometer - lastDoneOdometer)
  const color: DueColor =
    milesRemaining <= 0 ? "red" : milesRemaining <= mileageAmberThreshold(intervalMiles) ? "amber" : "green"
  return { color, milesRemaining }
}
