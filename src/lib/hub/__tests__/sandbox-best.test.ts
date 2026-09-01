/**
 * The record a player is asked to beat.
 *
 * Two things are worth a gate here. First, the ranking: score before money.
 * Rank on money alone and the crown goes to the shift where the autopilot
 * happened to collect a big invoice, not the shift where somebody actually
 * cleared the board — which teaches the wrong lesson about the software and
 * would be very hard to notice by looking at a screenshot.
 *
 * Second, that a FIRST shift sets the record instead of beating one. The
 * recap says "you beat your last shift", and saying that to someone on their
 * first shift is the kind of praise that makes the real thing worthless.
 */
import { describe, expect, it } from "vitest"
import {
  beatsExisting,
  bestKey,
  betterThan,
  parseBest,
  worthRemembering,
  type PersonalBest,
} from "../sandbox-best"

const at = (over: Partial<PersonalBest> = {}): PersonalBest => ({
  score: 50,
  cents: 100_00,
  minutes: 30,
  at: "2026-09-01T09:00:00.000Z",
  ...over,
})

describe("what counts as a better shift", () => {
  it("ranks on the job done, not on the money that happened to land", () => {
    const workedHarder = at({ score: 80, cents: 10_00 })
    const gotLucky = at({ score: 40, cents: 5_000_00 })
    expect(betterThan(gotLucky, workedHarder)).toBe(true)
    expect(betterThan(workedHarder, gotLucky)).toBe(false)
  })

  it("uses money only to break a tie on the same score", () => {
    expect(betterThan(at({ score: 60, cents: 100_00 }), at({ score: 60, cents: 101_00 }))).toBe(true)
    expect(betterThan(at({ score: 60, cents: 100_00 }), at({ score: 60, cents: 99_00 }))).toBe(false)
  })

  it("does not count an identical shift as an improvement", () => {
    expect(betterThan(at(), at())).toBe(false)
  })

  it("treats a first shift as setting the record, never as beating one", () => {
    // betterThan says "store it"; beatsExisting says "say something about it".
    expect(betterThan(null, at())).toBe(true)
    expect(beatsExisting(null, at())).toBe(false)
    expect(beatsExisting(at({ score: 10 }), at({ score: 90 }))).toBe(true)
  })
})

describe("what is worth remembering at all", () => {
  it("does not call an empty shift a record", () => {
    // Clock in, clock straight back out: no objectives, no money. The first
    // version stored this, and the card then read "Your best shift here: 0%
    // of the job, $0" — not a target, just a line that makes the feature look
    // broken. Every unit test passed; a screenshot caught it.
    expect(worthRemembering(at({ score: 0, cents: 0 }))).toBe(false)
  })

  it("keeps anything the player actually did, however small", () => {
    // The bar is zero, not "good". The point is to have something to beat.
    expect(worthRemembering(at({ score: 0, cents: 1 }))).toBe(true)
    expect(worthRemembering(at({ score: 1, cents: 0 }))).toBe(true)
  })
})

describe("reading a record back out of a browser", () => {
  it("keys per seat, so a dispatcher's record is not a driver's", () => {
    expect(bestKey("dispatcher")).not.toBe(bestKey("driver"))
  })

  it("round-trips a real record", () => {
    const b = at({ score: 75, cents: 4_210_00, minutes: 46 })
    expect(parseBest(JSON.stringify(b))).toEqual(b)
  })

  it("refuses anything it cannot render as a number", () => {
    // This value is shown to the player as a figure to beat. Storage is shared
    // with every other tab and every past version of this code, so a partial
    // object is a real possibility — and "undefined%" is worse than no line.
    expect(parseBest(null)).toBeNull()
    expect(parseBest("")).toBeNull()
    expect(parseBest("not json")).toBeNull()
    expect(parseBest("{}")).toBeNull()
    expect(parseBest(JSON.stringify({ score: 50 }))).toBeNull()
    expect(parseBest(JSON.stringify({ cents: 100 }))).toBeNull()
    expect(parseBest(JSON.stringify({ score: "50", cents: 100 }))).toBeNull()
    expect(parseBest(JSON.stringify({ score: NaN, cents: 100 }))).toBeNull()
  })

  it("fills in the soft fields rather than dropping a usable record", () => {
    // score and cents are the record; minutes and the timestamp are garnish,
    // and losing a real best over a missing "minutes" would be the wrong trade.
    const got = parseBest(JSON.stringify({ score: 70, cents: 500 }))
    expect(got).toEqual({ score: 70, cents: 500, minutes: 0, at: "" })
  })
})
