/**
 * Shift Mode scoring, pure: a shift is a baseline metrics snapshot taken at
 * clock-in and a current snapshot, diffed. No SQL, no clocks — the server
 * readers (sandbox-shift.ts) produce ShiftMetrics; this module turns two of
 * them into objectives, a score, and a recap headline. Client and tests both
 * import it, so keep it dependency-free.
 */

export type ShiftSeatKey = "dispatcher" | "driver" | "accountant"

export const SHIFT_SEATS: ShiftSeatKey[] = ["dispatcher", "driver", "accountant"]

export function isShiftSeat(key: string | null | undefined): key is ShiftSeatKey {
  return key === "dispatcher" || key === "driver" || key === "accountant"
}

/** Everything a shift can score, snapshot at one instant. Counters are
 *  cumulative (all-time, per-user where named `my…`) so diffs are shift
 *  totals; `quotedCount`/`unbilledCount` are board depths, compared raw. */
export interface ShiftMetrics {
  at: string
  myBookings: number
  myDispatches: number
  quotedCount: number
  myStatusMoves: number
  myPodsSubmitted: number
  myArrivals: number
  myOnTimeArrivals: number
  myInvoices: number
  myInvoicedCents: number
  paymentsRecorded: number
  unbilledCount: number
}

export interface ShiftObjective {
  key: string
  label: string
  /** Progress toward `target`; binary objectives use target 1. */
  target: number
  progress: number
  done: boolean
}

export interface ShiftEvaluation {
  objectives: ShiftObjective[]
  /** 0–100: share of objectives complete. */
  score: number
  headline: string
  /** Delivery on-time percentage across the shift (driver seats), 0–100. */
  onTimePct: number | null
  minutes: number
}

const clamp = (n: number) => Math.max(0, n)

function objectivesFor(seat: ShiftSeatKey, base: ShiftMetrics, cur: ShiftMetrics): ShiftObjective[] {
  const make = (key: string, label: string, target: number, progress: number): ShiftObjective => ({
    key,
    label,
    target,
    progress: Math.min(target, clamp(progress)),
    done: clamp(progress) >= target,
  })
  switch (seat) {
    case "dispatcher":
      return [
        make("book", "Book 2 loads off the quoted board", 2, cur.myBookings - base.myBookings),
        make("dispatch", "Dispatch a load to a driver", 1, cur.myDispatches - base.myDispatches),
        make("board", "Clock out with the quoted board under 6", 1, cur.quotedCount < 6 ? 1 : 0),
      ]
    case "driver":
      return [
        make("legs", "Advance your load 3 legs (arrive → load → deliver)", 3, cur.myStatusMoves - base.myStatusMoves),
        make("ontime", "Arrive inside the appointment window", 1, cur.myOnTimeArrivals - base.myOnTimeArrivals),
        make("pod", "Submit the POD", 1, cur.myPodsSubmitted - base.myPodsSubmitted),
      ]
    case "accountant":
      return [
        make("invoice", "Invoice 2 delivered loads", 2, cur.myInvoices - base.myInvoices),
        make("billed", "Bill $3,000 or more", 1, cur.myInvoicedCents - base.myInvoicedCents >= 300_000 ? 1 : 0),
        make("payment", "A payment lands on an overdue invoice", 1, cur.paymentsRecorded - base.paymentsRecorded),
        make("backlog", "Shrink the unbilled backlog", 1, cur.unbilledCount < base.unbilledCount ? 1 : 0),
      ]
  }
}

function headlineFor(score: number): string {
  if (score >= 100) return "Clean shift — nothing left on the board."
  if (score >= 75) return "Strong shift. One thing got away from you."
  if (score >= 50) return "Honest work. The board noticed."
  if (score > 0) return "Rough one — the freight kept moving anyway."
  return "Clocked the hours. The work's still there tomorrow."
}

export function evaluateShift(seat: ShiftSeatKey, baseline: ShiftMetrics, current: ShiftMetrics): ShiftEvaluation {
  const objectives = objectivesFor(seat, baseline, current)
  const done = objectives.filter((o) => o.done).length
  const score = objectives.length ? Math.round((done / objectives.length) * 100) : 0
  const arrivals = current.myArrivals - baseline.myArrivals
  const onTime = current.myOnTimeArrivals - baseline.myOnTimeArrivals
  const minutes = Math.max(
    0,
    Math.round((new Date(current.at).getTime() - new Date(baseline.at).getTime()) / 60_000)
  )
  return {
    objectives,
    score,
    headline: headlineFor(score),
    onTimePct: seat === "driver" && arrivals > 0 ? Math.round((onTime / arrivals) * 100) : null,
    minutes,
  }
}
