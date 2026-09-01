/**
 * Turns a parsed FMCSA ELD output file into hub.hos_snapshots rows — the
 * pure planning half of the import, so the matching/dedup/clock logic is
 * testable without a database and the server action stays a thin shell.
 *
 * hos_snapshots is already the duty-status time series every HOS reader
 * consumes (telematics.ts writes the same shape from live feeds), so an
 * ELD-file upload lands as source "eld-file" rows in the same table and the
 * map, dispatch legality check and driver views light up with zero new read
 * paths. Only the LAST event per driver carries computed clocks: earlier
 * rows are history, and a per-event computeHos would be quadratic for no
 * reader that wants it.
 *
 * Dedup is by exact (driver, timestamp) against rows this source already
 * wrote: re-uploading the same file — the obvious user reflex when nothing
 * seems to happen — must be a no-op, not a doubled log.
 */
import type { EldFileParseOk } from "./eld-output-file"
import { computeHos } from "./hos"

export interface EldSnapshotRow {
  driverId: string
  /** ISO timestamp of the duty-status change. */
  ts: string
  dutyStatus: string
  /** Present only on the chronologically last new event per driver. */
  driveRemainingMinutes?: number
  shiftRemainingMinutes?: number
  cycleRemainingMinutes?: number
}

export interface EldImportPlan {
  rows: EldSnapshotRow[]
  matchedDrivers: number
  /** "First Last" names in the file that no roster driver matched. */
  unmatchedDrivers: string[]
  skippedDuplicates: number
}

export function planEldSnapshotRows(
  parsed: EldFileParseOk,
  driverIdByName: Map<string, string>,
  existingTsByDriver: Map<string, Set<string>>,
  opts: { cycle?: 60 | 70 } = {}
): EldImportPlan {
  const rows: EldSnapshotRow[] = []
  const unmatchedDrivers: string[] = []
  let matchedDrivers = 0
  let skippedDuplicates = 0

  for (const driver of parsed.drivers) {
    if (driver.events.length === 0) continue
    const name = `${driver.firstName} ${driver.lastName}`.trim()
    const driverId = driverIdByName.get(name.toLowerCase())
    if (!driverId) {
      unmatchedDrivers.push(name)
      continue
    }
    matchedDrivers++
    const existing = existingTsByDriver.get(driverId) ?? new Set<string>()
    const fresh = driver.events.filter((e) => {
      if (existing.has(e.at)) {
        skippedDuplicates++
        return false
      }
      return true
    })
    if (fresh.length === 0) continue

    // Clocks as of the file's last event, computed over the FULL log (old
    // events included — a deduped re-upload with three new events must not
    // compute a 70-hour cycle from three events).
    const lastAt = driver.events[driver.events.length - 1]!.at
    const clocks = computeHos(driver.events, { now: lastAt, cycle: opts.cycle ?? 70 })

    for (const event of fresh) {
      const isLast = event.at === lastAt
      rows.push({
        driverId,
        ts: event.at,
        dutyStatus: event.status,
        ...(isLast
          ? {
              driveRemainingMinutes: clocks.driveRemainingMinutes,
              shiftRemainingMinutes: clocks.shiftRemainingMinutes,
              cycleRemainingMinutes: clocks.cycleRemainingMinutes,
            }
          : {}),
      })
    }
  }

  return { rows, matchedDrivers, unmatchedDrivers, skippedDuplicates }
}
