/**
 * Shift Mode's recap math: a shift is two ShiftMetrics snapshots diffed, so
 * the whole scoring story — per-seat objectives, clamping, the on-time
 * percentage, the shift clock — has to be pure and exact. The epoch-voiding
 * behavior these numbers feed lives client-side; what's pinned here is that
 * the diff can never go negative, never over-credit, and never scores a
 * seat's work with another seat's rubric.
 */
import { describe, expect, it } from "vitest"
import { evaluateShift, isShiftSeat, type ShiftMetrics } from "../sandbox-objectives"

function metrics(over: Partial<ShiftMetrics> = {}): ShiftMetrics {
  return {
    at: "2026-01-15T18:00:00.000Z",
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
    ...over,
  }
}

describe("isShiftSeat", () => {
  it("admits exactly the three core seats", () => {
    expect(isShiftSeat("dispatcher")).toBe(true)
    expect(isShiftSeat("driver")).toBe(true)
    expect(isShiftSeat("accountant")).toBe(true)
    expect(isShiftSeat("owner")).toBe(false)
    expect(isShiftSeat("broker")).toBe(false)
    expect(isShiftSeat(undefined)).toBe(false)
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

describe("the shift clock", () => {
  it("never reads negative even if snapshots arrive out of order", () => {
    const base = metrics({ at: "2026-01-15T19:00:00.000Z" })
    const cur = metrics({ at: "2026-01-15T18:00:00.000Z" })
    expect(evaluateShift("dispatcher", base, cur).minutes).toBe(0)
  })
})
