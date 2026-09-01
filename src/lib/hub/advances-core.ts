/**
 * Pure advance-exposure math (client + test safe — no DB, no server imports).
 *
 * A small carrier that runs fuel advances needs one number before approving the
 * next pump request: how much is this driver already into us for? "Outstanding"
 * is approved money that will be recovered on the next settlement; "pending" is
 * money the driver has asked for but nobody has approved yet. Both count toward
 * exposure so the office never over-advances a driver into a negative check.
 */

export interface AdvanceLite {
  driver_id: string
  driver_name?: string | null
  status: "pending" | "outstanding" | "applied" | "cancelled"
  amount_cents: number
}

export interface DriverAdvanceBalance {
  driver_id: string
  driver_name: string
  /** Approved, not yet recovered — deducts on the next settlement. */
  outstanding_cents: number
  /** Requested by the driver, awaiting an approve/deny decision. */
  pending_cents: number
  /** outstanding + pending — total the driver is currently into the carrier for. */
  exposure_cents: number
}

/** Cumulative outstanding+pending cap per driver, carrier-wide — the office/driver-app
 * issuance paths must refuse a new advance that would push a driver past this before the
 * next settlement can recover any of it. */
export const MAX_DRIVER_ADVANCE_EXPOSURE_CENTS = 150000

/** True if adding `newAmountCents` to a driver's current exposure would clear the cap. */
export function advanceExposureExceedsCap(existingExposureCents: number, newAmountCents: number): boolean {
  return existingExposureCents + newAmountCents > MAX_DRIVER_ADVANCE_EXPOSURE_CENTS
}

/**
 * Per-driver exposure from a flat advance list (reuse whatever `listAdvances`
 * already returned — no extra query). Only drivers with live exposure are
 * returned, heaviest first, so the panel stays short. `applied`/`cancelled`
 * advances are settled history and never count.
 */
export function advanceBalances(rows: AdvanceLite[]): DriverAdvanceBalance[] {
  const byDriver = new Map<string, DriverAdvanceBalance>()
  for (const row of rows) {
    if (row.status !== "outstanding" && row.status !== "pending") continue
    const amount = Number(row.amount_cents) || 0
    const entry =
      byDriver.get(row.driver_id) ??
      {
        driver_id: row.driver_id,
        driver_name: row.driver_name ?? "Driver",
        outstanding_cents: 0,
        pending_cents: 0,
        exposure_cents: 0,
      }
    if (row.status === "outstanding") entry.outstanding_cents += amount
    else entry.pending_cents += amount
    entry.exposure_cents = entry.outstanding_cents + entry.pending_cents
    byDriver.set(row.driver_id, entry)
  }
  return [...byDriver.values()].sort((a, b) => b.exposure_cents - a.exposure_cents)
}
