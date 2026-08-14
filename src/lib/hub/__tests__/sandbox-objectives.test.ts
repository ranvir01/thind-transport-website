/**
 * Shift Mode's recap math: a shift is two ShiftMetrics snapshots diffed, so
 * the whole scoring story — per-seat objectives, clamping, the on-time
 * percentage, the shift clock — has to be pure and exact. The epoch-voiding
 * behavior these numbers feed lives client-side; what's pinned here is that
 * the diff can never go negative, never over-credit, and never scores a
 * seat's work with another seat's rubric.
 */
import { describe, expect, it } from "vitest"
import { emptyMetrics, evaluateShift, isShiftSeat, SHIFT_SEATS, type ShiftMetrics } from "../sandbox-objectives"

function metrics(over: Partial<ShiftMetrics> = {}): ShiftMetrics {
  return {
    ...emptyMetrics("2026-01-15T18:00:00.000Z"),
    myBookings: 10,
    myDispatches: 5,
    quotedCount: 7,
    myStatusMoves: 40,
    myPodsSubmitted: 8,
    myArrivals: 12,
    myOnTimeArrivals: 9,
    myInvoices: 20,
    myInvoicedCents: 5_000_000,
    paymentsRecorded: 100,
    unbilledCount: 10,
    // office seats
    mySettlementApprovals: 3,
    mySettlementPayouts: 2,
    myAdvances: 1,
    myPayments: 4,
    draftSettlements: 6,
    myIncidents: 2,
    myIncidentsClosed: 1,
    myRepairCerts: 1,
    myRandomTestResults: 0,
    openIncidents: 5,
    ...over,
  }
}

describe("isShiftSeat", () => {
  it("admits exactly the seats that have a scored rubric", () => {
    for (const seat of ["dispatcher", "driver", "accountant", "owner", "safety"]) {
      expect(isShiftSeat(seat), seat).toBe(true)
    }
    for (const seat of ["recruiter", "owner_operator"]) {
      expect(isShiftSeat(seat), seat).toBe(true)
    }
    // The two portal seats are read-mostly — no scored rubric, so they keep
    // their guided tour instead of a shift they couldn't win.
    for (const seat of ["broker", "shipper", "nonsense"]) {
      expect(isShiftSeat(seat), seat).toBe(false)
    }
    expect(isShiftSeat(undefined)).toBe(false)
  })

  it("every listed shift seat really has objectives", () => {
    for (const seat of SHIFT_SEATS) {
      const ev = evaluateShift(seat, metrics(), metrics())
      expect(ev.objectives.length, seat).toBeGreaterThan(0)
    }
  })
})

describe("dispatcher shift", () => {
  it("a clean shift: 2 booked, 1 dispatched, board under 6 → 100%", () => {
    const base = metrics()
    const cur = metrics({
      at: "2026-01-15T18:45:00.000Z",
      myBookings: 12,
      myDispatches: 6,
      quotedCount: 4,
    })
    const ev = evaluateShift("dispatcher", base, cur)
    expect(ev.score).toBe(100)
    expect(ev.objectives.every((o) => o.done)).toBe(true)
    expect(ev.minutes).toBe(45)
    expect(ev.onTimePct).toBeNull() // driver-only stat
  })

  it("progress clamps to the target and never goes negative", () => {
    const base = metrics()
    const cur = metrics({ myBookings: 17, myDispatches: 4, quotedCount: 9 }) // 7 books, "-1" dispatch
    const ev = evaluateShift("dispatcher", base, cur)
    const book = ev.objectives.find((o) => o.key === "book")!
    const dispatch = ev.objectives.find((o) => o.key === "dispatch")!
    expect(book.progress).toBe(2) // clamped to target
    expect(dispatch.progress).toBe(0) // never negative
    expect(ev.score).toBe(33) // 1 of 3
  })
})

describe("driver shift", () => {
  it("legs + on-time arrival + POD, with the on-time percentage from shift arrivals only", () => {
    const base = metrics()
    const cur = metrics({
      at: "2026-01-15T19:30:00.000Z",
      myStatusMoves: 43,
      myArrivals: 14,
      myOnTimeArrivals: 10,
      myPodsSubmitted: 9,
    })
    const ev = evaluateShift("driver", base, cur)
    expect(ev.score).toBe(100)
    expect(ev.onTimePct).toBe(50) // 1 on-time of 2 shift arrivals — history doesn't pad it
    expect(ev.minutes).toBe(90)
  })

  it("no arrivals this shift → no on-time percentage rather than a fake 0", () => {
    const ev = evaluateShift("driver", metrics(), metrics())
    expect(ev.onTimePct).toBeNull()
    expect(ev.score).toBe(0)
  })
})

describe("accountant shift", () => {
  it("full marks needs invoices, $3k billed, a payment, and a smaller backlog", () => {
    const base = metrics()
    const cur = metrics({
      myInvoices: 22,
      myInvoicedCents: 5_400_000, // +$4,000
      paymentsRecorded: 101,
      unbilledCount: 8,
    })
    const ev = evaluateShift("accountant", base, cur)
    expect(ev.score).toBe(100)
  })

  it("billing under $3k and a grown backlog miss those objectives", () => {
    const base = metrics()
    const cur = metrics({
      myInvoices: 22,
      myInvoicedCents: 5_200_000, // +$2,000 — under the bar
      paymentsRecorded: 100,
      unbilledCount: 12,
    })
    const ev = evaluateShift("accountant", base, cur)
    const byKey = new Map(ev.objectives.map((o) => [o.key, o.done]))
    expect(byKey.get("invoice")).toBe(true)
    expect(byKey.get("billed")).toBe(false)
    expect(byKey.get("payment")).toBe(false)
    expect(byKey.get("backlog")).toBe(false)
    expect(ev.score).toBe(25)
  })
})

describe("owner shift", () => {
  it("approve, pay, move money yourself, and leave the pay queue shorter", () => {
    const base = metrics()
    const cur = metrics({
      mySettlementApprovals: 4,
      mySettlementPayouts: 3,
      myPayments: 5,
      draftSettlements: 4,
    })
    const ev = evaluateShift("owner", base, cur)
    expect(ev.score).toBe(100)
  })

  it("an advance counts for the money objective just as a payment does", () => {
    const base = metrics()
    const viaAdvance = evaluateShift("owner", base, metrics({ myAdvances: 2 }))
    expect(viaAdvance.objectives.find((o) => o.key === "cash")?.done).toBe(true)
    const neither = evaluateShift("owner", base, metrics())
    expect(neither.objectives.find((o) => o.key === "cash")?.done).toBe(false)
  })

  it("a growing pay queue misses the queue objective", () => {
    const ev = evaluateShift("owner", metrics(), metrics({ draftSettlements: 9 }))
    expect(ev.objectives.find((o) => o.key === "queue")?.done).toBe(false)
  })
})

describe("safety shift", () => {
  it("release a truck, log an incident, close one, and shrink the open list", () => {
    const base = metrics()
    const cur = metrics({
      myRepairCerts: 2,
      myIncidents: 3,
      myIncidentsClosed: 2,
      openIncidents: 4,
    })
    expect(evaluateShift("safety", base, cur).score).toBe(100)
  })

  it("doing nothing scores nothing, and the open list is compared raw", () => {
    const ev = evaluateShift("safety", metrics(), metrics())
    expect(ev.score).toBe(0)
    expect(ev.objectives.find((o) => o.key === "open")?.done).toBe(false)
  })

  it("never scores another seat's rubric", () => {
    // Safety work must not satisfy the owner's objectives and vice versa.
    const safetyWork = metrics({ myRepairCerts: 5, myIncidents: 5, myIncidentsClosed: 5, openIncidents: 0 })
    expect(evaluateShift("owner", metrics(), safetyWork).score).toBe(0)
    const ownerWork = metrics({ mySettlementApprovals: 9, mySettlementPayouts: 9, myPayments: 9, draftSettlements: 0 })
    expect(evaluateShift("safety", metrics(), ownerWork).score).toBe(0)
  })
})

describe("recruiter shift", () => {
  it("move the pipeline, sign an offer, hire, and shrink the applied pile", () => {
    const cur = metrics({ myStageAdvances: 2, myOffersSigned: 1, myHires: 1, applicantsWaiting: -1 })
    // applicantsWaiting is a board depth: start it above the current value.
    const base = metrics({ applicantsWaiting: 4 })
    const ev = evaluateShift("recruiter", base, { ...cur, applicantsWaiting: 2 })
    expect(ev.score).toBe(100)
  })

  it("stage moves clamp at the target and a stalled pipeline scores zero", () => {
    const base = metrics({ applicantsWaiting: 4 })
    const stalled = evaluateShift("recruiter", base, metrics({ applicantsWaiting: 4 }))
    expect(stalled.score).toBe(0)
    const overshoot = evaluateShift("recruiter", base, metrics({ myStageAdvances: 9, applicantsWaiting: 4 }))
    expect(overshoot.objectives.find((o) => o.key === "advance")?.progress).toBe(2)
  })
})

/**
 * Regression for the nightly's find: an idle dispatcher scored 33/100 because
 * the simulation drained the quoted board for them (sandbox-sim.ts npcBook /
 * offerPlayerLoad), and "Book faster than the brokers call" only compared the
 * board's depth. Every board-state objective had the same shape, and
 * `autoInvoice` shrinks the unbilled pile the same way. A pile shrinking is
 * now only worth a point when the player's own actor-scoped counter moved too.
 */
describe("board-state objectives are never earned by the simulation", () => {
  const cases: Array<{ seat: Parameters<typeof evaluateShift>[0]; key: string; idle: Partial<ShiftMetrics>; byHand: Partial<ShiftMetrics> }> = [
    // The sim books quoted loads on its own clock.
    { seat: "dispatcher", key: "board", idle: { quotedCount: 2 }, byHand: { quotedCount: 2, myBookings: 11 } },
    // The sim invoices delivered loads (autoInvoice), draining pod_received.
    { seat: "accountant", key: "backlog", idle: { unbilledCount: 3 }, byHand: { unbilledCount: 3, myInvoices: 21 } },
    { seat: "owner", key: "queue", idle: { draftSettlements: 1 }, byHand: { draftSettlements: 1, mySettlementApprovals: 4 } },
    { seat: "safety", key: "open", idle: { openIncidents: 1 }, byHand: { openIncidents: 1, myIncidentsClosed: 2 } },
    { seat: "recruiter", key: "pipeline", idle: { applicantsWaiting: 1 }, byHand: { applicantsWaiting: 1, myStageAdvances: 1 } },
  ]

  for (const { seat, key, idle, byHand } of cases) {
    it(`${seat}: the pile draining on its own is worth nothing`, () => {
      const base = metrics({ applicantsWaiting: 4 })
      const idleEv = evaluateShift(seat, base, metrics({ ...idle, applicantsWaiting: idle.applicantsWaiting ?? 4 }))
      expect(idleEv.objectives.find((o) => o.key === key)?.done, `${seat}/${key} completed while the player sat still`).toBe(false)
      expect(idleEv.score, `${seat} scored for work it did not do`).toBe(0)
    })

    it(`${seat}: the same pile draining still counts when the player pushed`, () => {
      const base = metrics({ applicantsWaiting: 4 })
      const worked = evaluateShift(seat, base, metrics({ ...byHand, applicantsWaiting: byHand.applicantsWaiting ?? 4 }))
      expect(worked.objectives.find((o) => o.key === key)?.done, `${seat}/${key} stopped rewarding real work`).toBe(true)
    })
  }

  it("a whole idle shift scores zero for every scored seat", () => {
    // The sim moves the world for all of them at once; no seat may bank it.
    const base = metrics({ applicantsWaiting: 9 })
    const simDidEverything = metrics({
      quotedCount: 0, unbilledCount: 0, draftSettlements: 0, openIncidents: 0, applicantsWaiting: 0,
    })
    for (const seat of SHIFT_SEATS) {
      expect(evaluateShift(seat, base, simDidEverything).score, seat).toBe(0)
    }
  })
})

describe("owner-operator shift", () => {
  it("scores his own money and equipment, not just the driving", () => {
    const cur = metrics({ myStatusMoves: 42, myReceipts: 1, myAdvanceRequests: 1, myDvirs: 2 })
    expect(evaluateShift("owner_operator", metrics(), cur).score).toBe(100)
  })

  it("is a different rubric from the company driver's", () => {
    const ev = evaluateShift("owner_operator", metrics(), metrics())
    expect(ev.objectives.map((o) => o.key)).toEqual(["legs", "receipt", "advance", "dvir"])
    // Driving alone doesn't finish an owner-operator's day — the paperwork
    // that decides what he takes home is the point of this seat.
    const drivingOnly = evaluateShift("owner_operator", metrics(), metrics({ myStatusMoves: 45 }))
    expect(drivingOnly.score).toBe(25)
  })
})

describe("the shift clock", () => {
  it("never reads negative even if snapshots arrive out of order", () => {
    const base = metrics({ at: "2026-01-15T19:00:00.000Z" })
    const cur = metrics({ at: "2026-01-15T18:00:00.000Z" })
    expect(evaluateShift("dispatcher", base, cur).minutes).toBe(0)
  })
})
