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
  // — money —
  // Every seat's work is worth something to somebody, and a shift that can't
  // show you that is just a chore list. These are real cents off real rows —
  // driver pay runs through the SAME engine settlements use, so the number on
  // the card is the number the software would actually pay. Cumulative like
  // every other counter, so a diff is the shift's total.
  //
  // Personal — what YOU moved:
  myFreightBookedCents: number
  myPayCents: number
  myCashMovedCents: number
  /** Safety: freight riding on trucks this user certified back into service. */
  myReleasedTruckFreightCents: number
  /** Recruiter: freight riding with drivers this user hired. */
  myHiredDriverFreightCents: number
  // The company's shift — everyone's work, human and autopilot alike. The
  // point of the place is that it pays people; a seat that only ever sees its
  // own square of the board never sees that.
  coDeliveredCents: number
  coBilledCents: number
  coCollectedCents: number
  /**
   * Freight on the road RIGHT NOW — a standing total, not a shift diff.
   *
   * The three above are what the shift earned, and for the first few minutes
   * of any shift they are all honestly zero: nothing has arrived yet. A money
   * panel that stays blank while you work reads as broken, and padding it
   * with a fake number would be worse. This is the true thing that is never
   * zero — there is always freight in motion, and it is the reason everyone
   * here has a job.
   */
  coRollingCents: number
  /**
   * What is going wrong right now, in money.
   *
   * Everything above this line is upside — earned, booked, billed, rolling.
   * A shift that only ever counts wins teaches the wrong lesson about running
   * a carrier, and it hides the one thing this software is actually for:
   * telling you a truck is sitting while there is still time to do something
   * about it. Both are standing totals read straight, never diffed — a
   * problem you inherited at clock-in is still costing you money now.
   */
  coDwellingCents: number
  coOverdueCents: number
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
    myFreightBookedCents: 0, myPayCents: 0, myCashMovedCents: 0,
    myReleasedTruckFreightCents: 0, myHiredDriverFreightCents: 0,
    coDeliveredCents: 0, coBilledCents: 0, coCollectedCents: 0, coRollingCents: 0,
    coDwellingCents: 0, coOverdueCents: 0,
  }
}

/**
 * The money a shift moved: one personal line and the company's three.
 *
 * `personalCents` is what this player, in this seat, is responsible for — and
 * it is always a real figure off real rows, never a made-up score. Two seats
 * take the long way round to get there, because their work pays off through
 * somebody else's wheels: safety's number is the freight riding on trucks
 * they put back in service, recruiter's is the freight riding with drivers
 * they hired. Both are still just loads with rates on them.
 *
 * `standing` is true when the figure is a snapshot of what is out there right
 * now rather than something earned inside the shift window — those two seats
 * again. Diffing them would show nothing on a short shift and would flatter
 * a long one, so they are read straight.
 */
export interface ShiftMoney {
  personalCents: number
  personalLabel: string
  standing: boolean
  deliveredCents: number
  billedCents: number
  collectedCents: number
  /** Standing, not a diff — what is on the road at this instant. */
  rollingCents: number
  /** Standing — what is costing the company money right now. */
  dwellingCents: number
  overdueCents: number
}

export function shiftMoney(seat: ShiftSeatKey, base: ShiftMetrics, cur: ShiftMetrics): ShiftMoney {
  const diff = (pick: (m: ShiftMetrics) => number) => clamp(pick(cur) - pick(base))
  const company = {
    deliveredCents: diff((m) => m.coDeliveredCents),
    billedCents: diff((m) => m.coBilledCents),
    collectedCents: diff((m) => m.coCollectedCents),
    rollingCents: clamp(cur.coRollingCents),
    dwellingCents: clamp(cur.coDwellingCents),
    overdueCents: clamp(cur.coOverdueCents),
  }
  switch (seat) {
    case "dispatcher":
      return { personalCents: diff((m) => m.myFreightBookedCents), personalLabel: "Freight you booked", standing: false, ...company }
    case "driver":
      return { personalCents: diff((m) => m.myPayCents), personalLabel: "You earned", standing: false, ...company }
    case "accountant":
      return { personalCents: diff((m) => m.myInvoicedCents), personalLabel: "You billed", standing: false, ...company }
    case "owner":
      return { personalCents: diff((m) => m.myCashMovedCents), personalLabel: "Money you moved", standing: false, ...company }
    case "owner_operator":
      return { personalCents: diff((m) => m.myPayCents), personalLabel: "Your take", standing: false, ...company }
    case "safety":
      return {
        personalCents: clamp(cur.myReleasedTruckFreightCents),
        personalLabel: "Rolling on trucks you released",
        standing: true,
        ...company,
      }
    case "recruiter":
      return {
        personalCents: clamp(cur.myHiredDriverFreightCents),
        personalLabel: "Rolling with drivers you hired",
        standing: true,
        ...company,
      }
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
  money: ShiftMoney
}

const clamp = (n: number) => Math.max(0, n)

/**
 * Board-depth objectives ("leave the pile shorter than you found it") compare
 * a count the SIMULATION also moves: the autopilot dispatcher books off the
 * quoted board, the autopilot accountant invoices, and so on. A depth drop on
 * its own therefore proves nothing about the player — an idle dispatcher who
 * clocks in, watches six hours of sim ticks and clocks out used to finish the
 * shift 33% scored, credited for freight the sim booked.
 *
 * So a board objective needs both halves: the pile really is smaller AND the
 * player did the work that shrinks it. That keeps the doctrine the actor-
 * scoped `my…` counters already follow ("the sim's autopilot records payments
 * too and must never pad the player's score") true for the depth objectives,
 * which were the one place it leaked.
 */
const shrankByHand = (shrank: boolean, myWork: number) => (shrank && myWork > 0 ? 1 : 0)

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
        //
        // The depth alone is not enough, though: the sim books off that same
        // board (npcBook) and expires stale quotes (dropQuotedLoad), so an
        // idle dispatcher watched the pile shrink and collected this — one of
        // three objectives, a flat 33 for doing nothing. Requiring a booking
        // of your own keeps the "outpace the brokers" meaning while making it
        // unwinnable from the break room.
        make(
          "board",
          "Book faster than the brokers call",
          1,
          shrankByHand(cur.quotedCount < base.quotedCount, cur.myBookings - base.myBookings)
        ),
      ]
    case "driver":
      return [
        // Three legs is more than one load offers from the seat (the seeded
        // run is already rolling — deliver is the only status left), so the
        // rest come off the NEXT load: send the POD, and dispatch offers you
        // one a few minutes later. The label says so; a target you cannot
        // see the path to reads as the product losing your work.
        make("legs", "Move freight 3 legs — deliver, then arrive and load the next one", 3, cur.myStatusMoves - base.myStatusMoves),
        make("ontime", "Arrive inside the appointment window", 1, cur.myOnTimeArrivals - base.myOnTimeArrivals),
        make("pod", "Send the POD from your phone", 1, cur.myPodsSubmitted - base.myPodsSubmitted),
      ]
    case "accountant":
      return [
        make("invoice", "Invoice 2 delivered loads", 2, cur.myInvoices - base.myInvoices),
        make("billed", "Bill $3,000 or more", 1, cur.myInvoicedCents - base.myInvoicedCents >= 300_000 ? 1 : 0),
        // Counts payments THIS user records (audit-scoped), on any invoice.
        // It used to say "on an overdue invoice", which the reader never
        // checked — the card ticked for a payment on a fresh one and the
        // label lied about what it had measured.
        make("payment", "Record a customer payment", 1, cur.paymentsRecorded - base.paymentsRecorded),
        // Same clamp as the dispatcher's board: the sim invoices delivered
        // loads itself (autoInvoice), which drains this backlog without the
        // accountant lifting a finger. Your own invoice has to be part of it.
        make(
          "backlog",
          "Shrink the unbilled backlog",
          1,
          shrankByHand(cur.unbilledCount < base.unbilledCount, cur.myInvoices - base.myInvoices)
        ),
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
        make(
          "queue",
          "Shrink the draft settlement queue",
          1,
          shrankByHand(
            cur.draftSettlements < base.draftSettlements,
            cur.mySettlementApprovals - base.mySettlementApprovals
          )
        ),
      ]
    case "safety":
      return [
        make("repair", "Certify a repair and put a truck back on the road", 1, cur.myRepairCerts - base.myRepairCerts),
        make("incident", "Log an incident on the register", 1, cur.myIncidents - base.myIncidents),
        make("close", "Close out an open incident", 1, cur.myIncidentsClosed - base.myIncidentsClosed),
        make(
          "open",
          "Leave the open-incident list shorter than you found it",
          1,
          shrankByHand(cur.openIncidents < base.openIncidents, cur.myIncidentsClosed - base.myIncidentsClosed)
        ),
      ]
    case "recruiter":
      return [
        make("advance", "Move 2 applicants forward a stage", 2, cur.myStageAdvances - base.myStageAdvances),
        make("sign", "Get an offer signed", 1, cur.myOffersSigned - base.myOffersSigned),
        make("hire", "Hire someone through the orientation gate", 1, cur.myHires - base.myHires),
        make(
          "pipeline",
          "Clear the applied pile down",
          1,
          shrankByHand(cur.applicantsWaiting < base.applicantsWaiting, cur.myStageAdvances - base.myStageAdvances)
        ),
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
    money: shiftMoney(seat, baseline, current),
  }
}
