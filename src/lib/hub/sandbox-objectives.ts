/**
 * Shift Mode scoring, pure: a shift is a baseline metrics snapshot taken at
 * clock-in and a current snapshot, diffed. No SQL, no clocks — the server
 * readers (sandbox-shift.ts) produce ShiftMetrics; this module turns two of
 * them into objectives, a score, and a recap headline. Client and tests both
 * import it, so keep it dependency-free.
 */

export type ShiftSeatKey =
  | "dispatcher"
  | "driver"
  | "accountant"
  | "owner"
  | "safety"
  | "recruiter"
  | "owner_operator"

export const SHIFT_SEATS: ShiftSeatKey[] = [
  "dispatcher",
  "driver",
  "accountant",
  "owner",
  "safety",
  "recruiter",
  "owner_operator",
]

export function isShiftSeat(key: string | null | undefined): key is ShiftSeatKey {
  return SHIFT_SEATS.includes(key as ShiftSeatKey)
}

/** Everything a shift can score, snapshot at one instant. Counters are
 *  cumulative (all-time, per-user where named `my…`) so diffs are shift
 *  totals; `quotedCount`/`unbilledCount` are board depths, compared raw. */
export interface ShiftMetrics {
  at: string
  // — dispatcher / driver / accountant —
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
  // — owner — every counter is actor-scoped, because the sim's autopilot
  // records payments too and must never pad the player's score.
  mySettlementApprovals: number
  mySettlementPayouts: number
  myAdvances: number
  myPayments: number
  draftSettlements: number
  // — safety —
  myIncidents: number
  myIncidentsClosed: number
  myRepairCerts: number
  myRandomTestResults: number
  openIncidents: number
  // — recruiter — note applicant_events carries only actor_name (no
  // actor_id column), so stage moves match on the seat's name; hires and
  // signatures use the stronger audit_log actor_id.
  myStageAdvances: number
  myOffersSigned: number
  myHires: number
  applicantsWaiting: number
  // — owner-operator — his own truck and his own money, all joined through
  // drivers.user_id so another driver's paperwork can never count.
  myReceipts: number
  myAdvanceRequests: number
  myDvirs: number
}

/** Zeroed metrics — seat readers fill only the counters their seat scores. */
export function emptyMetrics(at: string): ShiftMetrics {
  return {
    at,
    myBookings: 0, myDispatches: 0, quotedCount: 0, myStatusMoves: 0, myPodsSubmitted: 0,
    myArrivals: 0, myOnTimeArrivals: 0, myInvoices: 0, myInvoicedCents: 0,
    paymentsRecorded: 0, unbilledCount: 0,
    mySettlementApprovals: 0, mySettlementPayouts: 0, myAdvances: 0, myPayments: 0,
    draftSettlements: 0,
    myIncidents: 0, myIncidentsClosed: 0, myRepairCerts: 0, myRandomTestResults: 0,
    openIncidents: 0,
    myStageAdvances: 0, myOffersSigned: 0, myHires: 0, applicantsWaiting: 0,
    myReceipts: 0, myAdvanceRequests: 0, myDvirs: 0,
  }
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

/**
 * A board-state objective ("leave the pile smaller than you found it") compares
 * a carrier-wide count across the shift, so the simulation can satisfy it
 * unaided: `sandbox-sim.ts` books quoted loads (`npcBook`, `offerPlayerLoad`)
 * and invoices delivered ones (`autoInvoice`) on its own clock. An idle
 * dispatcher scored 33/100 that way — the board drained while they watched.
 *
 * Shrinking the pile therefore only counts when the player pushed in the same
 * direction: `playerDelta` is that seat's own actor-scoped counter for the
 * work that shrinks this pile. Same reading as before for anyone actually
 * working — you cannot book faster than the brokers call without booking.
 */
const shrankByHand = (curCount: number, baseCount: number, playerDelta: number) =>
  curCount < baseCount && playerDelta > 0 ? 1 : 0

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
        // Strictly smaller, like every other board objective. Brokers keep
        // adding to the quoted pile all shift, so ending below where you
        // started means you booked faster than they called. "At or below"
        // and the old absolute "under 6" both read as already-won the moment
        // you clock in, scoring nothing you actually did.
        make("board", "Book faster than the brokers call", 1,
          shrankByHand(cur.quotedCount, base.quotedCount, cur.myBookings - base.myBookings)),
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
        make("backlog", "Shrink the unbilled backlog", 1,
          shrankByHand(cur.unbilledCount, base.unbilledCount, cur.myInvoices - base.myInvoices)),
      ]
    case "owner":
      return [
        make("approve", "Approve a draft settlement", 1, cur.mySettlementApprovals - base.mySettlementApprovals),
        make("pay", "Pay an approved settlement", 1, cur.mySettlementPayouts - base.mySettlementPayouts),
        make(
          "cash",
          "Move money yourself — a payment or a driver advance",
          1,
          cur.myPayments - base.myPayments + (cur.myAdvances - base.myAdvances)
        ),
        make("queue", "Shrink the draft settlement queue", 1,
          shrankByHand(cur.draftSettlements, base.draftSettlements,
            cur.mySettlementApprovals - base.mySettlementApprovals)),
      ]
    case "safety":
      return [
        make("repair", "Certify a repair and put a truck back on the road", 1, cur.myRepairCerts - base.myRepairCerts),
        make("incident", "Log an incident on the register", 1, cur.myIncidents - base.myIncidents),
        make("close", "Close out an open incident", 1, cur.myIncidentsClosed - base.myIncidentsClosed),
        make("open", "Leave the open-incident list shorter than you found it", 1,
          shrankByHand(cur.openIncidents, base.openIncidents,
            cur.myIncidentsClosed - base.myIncidentsClosed)),
      ]
    case "recruiter":
      return [
        make("advance", "Move 2 applicants forward a stage", 2, cur.myStageAdvances - base.myStageAdvances),
        make("sign", "Get an offer signed", 1, cur.myOffersSigned - base.myOffersSigned),
        make("hire", "Hire someone through the orientation gate", 1, cur.myHires - base.myHires),
        make("pipeline", "Clear the applied pile down", 1,
          shrankByHand(cur.applicantsWaiting, base.applicantsWaiting,
            cur.myStageAdvances - base.myStageAdvances)),
      ]
    case "owner_operator":
      // Sam owns his truck. The driving is the company driver's rubric; what
      // makes this seat different is that the money and the equipment are
      // his — so it scores the paperwork that decides what he takes home.
      return [
        make("legs", "Move your load — 2 legs on the clock", 2, cur.myStatusMoves - base.myStatusMoves),
        make("receipt", "Send a receipt in for reimbursement", 1, cur.myReceipts - base.myReceipts),
        make("advance", "Draw an advance against your settlement", 1, cur.myAdvanceRequests - base.myAdvanceRequests),
        make("dvir", "File a DVIR on your own truck", 1, cur.myDvirs - base.myDvirs),
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
