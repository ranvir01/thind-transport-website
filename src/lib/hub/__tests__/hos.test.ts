/**
 * HOS rule engine (49 CFR 395) — tested against the regulation's own scenarios
 * rather than against the implementation. Every describe block cites the rule
 * it pins, so a future change that "simplifies" one of these has to argue with
 * the CFR rather than with a magic number.
 *
 * All logs are built from a fixed epoch so the arithmetic in the assertions is
 * checkable by hand: DAY0 is midnight UTC, and `at(h, m)` reads as clock time.
 */
import { describe, expect, it } from "vitest"
import {
  ADVERSE_BONUS_MINUTES,
  BREAK_AFTER_DRIVING_MINUTES,
  DRIVE_LIMIT_MINUTES,
  WINDOW_LIMIT_MINUTES,
  canDriveFor,
  computeHos,
  formatHosMinutes,
  hosLevelFromClocks,
  type DutyEvent,
} from "../hos"

const DAY0 = Date.UTC(2026, 0, 5, 0, 0, 0) // Monday
const HOUR_MS = 3_600_000

/** Hours (and optional minutes) after DAY0, as an ISO string. */
function at(hours: number, minutes = 0): string {
  return new Date(DAY0 + hours * HOUR_MS + minutes * 60_000).toISOString()
}

/** A driver who has just finished a clean 10-hour break at hour 0. */
function afterFullBreak(events: DutyEvent[]): DutyEvent[] {
  return [{ status: "off", at: at(-10) }, ...events]
}

describe("395.3(a)(1) — the 10-hour break establishes the window", () => {
  it("starts the 14-hour window when the break ends, not when driving starts", () => {
    const clocks = computeHos(
      afterFullBreak([
        { status: "on_duty", at: at(0) }, // pre-trip
        { status: "driving", at: at(0, 30) },
      ]),
      { now: at(2) }
    )
    expect(clocks.windowStartedAt).toBe(at(0))
    expect(clocks.windowIsCertain).toBe(true)
    // Two hours of window consumed, 90 minutes of it driving.
    expect(clocks.shiftRemainingMinutes).toBe(WINDOW_LIMIT_MINUTES - 120)
    expect(clocks.driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 90)
  })

  it("a 9h59m break does not reset — the window still runs from the earlier one", () => {
    const clocks = computeHos(
      [
        { status: "off", at: at(-20) },
        { status: "driving", at: at(-9) },
        { status: "off", at: at(-8) }, // 9h59m, one minute short
        { status: "driving", at: at(1, 59) },
      ],
      { now: at(6) }
    )
    // Window still anchored to the 10h+ break that ended at -9h, so by 06:00
    // the driver is 15 hours into a 14-hour window — out of time — even though
    // they have only driven about five hours.
    expect(clocks.windowStartedAt).toBe(at(-9))
    expect(clocks.violations).toContain("window-14")
    expect(clocks.violations).not.toContain("drive-11")
  })

  it("off-duty time inside the shift does NOT extend the 14-hour window", () => {
    // This is the rule drivers most often get wrong: a 4-hour nap mid-shift
    // buys back driving hours only via a qualifying sleeper split, not here.
    const clocks = computeHos(
      afterFullBreak([
        { status: "driving", at: at(0) },
        { status: "off", at: at(4) }, // 4 hours off, not sleeper
        { status: "driving", at: at(8) },
      ]),
      { now: at(13) }
    )
    expect(clocks.usedSleeperSplit).toBe(false)
    expect(clocks.shiftRemainingMinutes).toBe(WINDOW_LIMIT_MINUTES - 13 * 60)
  })
})

describe("395.3(a)(3)(i) — the 11-hour driving limit", () => {
  it("counts only driving, not on-duty-not-driving", () => {
    const clocks = computeHos(
      afterFullBreak([
        { status: "on_duty", at: at(0) }, // 3 hours loading
        { status: "driving", at: at(3) },
      ]),
      { now: at(8) }
    )
    expect(clocks.driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 5 * 60)
    expect(clocks.shiftRemainingMinutes).toBe(WINDOW_LIMIT_MINUTES - 8 * 60)
  })

  it("flags a violation at exactly 11 hours driven, and clamps rather than going negative", () => {
    const eleven = computeHos(
      afterFullBreak([{ status: "driving", at: at(0) }]),
      { now: at(11) }
    )
    expect(eleven.driveRemainingMinutes).toBe(0)
    expect(eleven.violations).toContain("drive-11")

    const over = computeHos(afterFullBreak([{ status: "driving", at: at(0) }]), { now: at(13) })
    expect(over.driveRemainingMinutes).toBe(0)
    expect(over.availableDriveMinutes).toBe(0)
  })

  it("the 11 binds before the 14 — a legally-broken day that still runs out of driving", () => {
    // Drive 8, take the required 30, drive 3 more. Eleven hours of driving
    // inside an 11.5-hour window: 2.5 hours of window left and a fresh break,
    // so the driving limit is the only thing stopping them.
    const log = afterFullBreak([
      { status: "driving", at: at(0) },
      { status: "off", at: at(8) },
      { status: "driving", at: at(8, 30) },
    ])
    const clocks = computeHos(log, { now: at(11, 30) })
    expect(clocks.driveRemainingMinutes).toBe(0)
    expect(clocks.shiftRemainingMinutes).toBe(150)
    expect(clocks.breakRemainingMinutes).toBe(5 * 60)
    expect(clocks.availableDriveMinutes).toBe(0)
    expect(canDriveFor(log, 30, { now: at(11, 30) })).toMatchObject({
      legal: false,
      blockedBy: "drive-11",
    })
  })

  it("when the 11 and the break run out together, the harder remedy is reported", () => {
    // Driving 11 hours straight blows both limits. A dispatcher told "take 30
    // minutes" would put the driver back out illegally — the answer must be
    // the 10-hour reset.
    const log = afterFullBreak([{ status: "driving", at: at(0) }])
    const clocks = computeHos(log, { now: at(11) })
    expect(clocks.violations).toEqual(expect.arrayContaining(["drive-11", "break-30"]))
    const result = canDriveFor(log, 60, { now: at(11) })
    expect(result.blockedBy).toBe("drive-11")
    expect(result.reason).toContain("10 consecutive hours off duty")
  })
})

describe("395.3(a)(3)(ii) — the 30-minute break", () => {
  it("comes due after 8 cumulative hours of driving", () => {
    const clocks = computeHos(afterFullBreak([{ status: "driving", at: at(0) }]), { now: at(8) })
    expect(clocks.breakRemainingMinutes).toBe(0)
    expect(clocks.violations).toContain("break-30")
    // The 11-hour clock still has 3 hours on it — the break is what stops them.
    expect(clocks.driveRemainingMinutes).toBe(3 * 60)
    expect(clocks.availableDriveMinutes).toBe(0)
  })

  it("is satisfied by 30 minutes ON DUTY not driving (2020 final rule)", () => {
    // Pre-2020 this required off-duty time. A 30-minute dock wait now counts.
    const clocks = computeHos(
      afterFullBreak([
        { status: "driving", at: at(0) },
        { status: "on_duty", at: at(5) }, // 30 min at a receiver
        { status: "driving", at: at(5, 30) },
      ]),
      { now: at(9) }
    )
    expect(clocks.breakRemainingMinutes).toBe(BREAK_AFTER_DRIVING_MINUTES - 3.5 * 60)
    expect(clocks.violations).not.toContain("break-30")
  })

  it("a 29-minute interruption does not reset the driving accumulator", () => {
    const clocks = computeHos(
      afterFullBreak([
        { status: "driving", at: at(0) },
        { status: "off", at: at(5) },
        { status: "driving", at: at(5, 29) },
      ]),
      { now: at(8, 29) }
    )
    // 8 hours of driving either side of a break that did not qualify.
    expect(clocks.breakRemainingMinutes).toBe(0)
    expect(clocks.violations).toContain("break-30")
  })

  it("counts the interruption as consecutive across adjacent non-driving statuses", () => {
    // 20 minutes on duty then 20 off is 40 consecutive minutes not driving.
    const clocks = computeHos(
      afterFullBreak([
        { status: "driving", at: at(0) },
        { status: "on_duty", at: at(4) },
        { status: "off", at: at(4, 20) },
        { status: "driving", at: at(4, 40) },
      ]),
      { now: at(8) }
    )
    expect(clocks.violations).not.toContain("break-30")
    expect(clocks.breakRemainingMinutes).toBe(BREAK_AFTER_DRIVING_MINUTES - 200)
  })
})

describe("395.1(g)(1) — sleeper-berth split", () => {
  it("an 8/2 split runs the window from the end of the first period", () => {
    // Drive 5, sleeper 8, drive 3, off 2. After the 2-hour period completes the
    // pair qualifies: window recalculates from the end of the 8-hour sleeper.
    const log: DutyEvent[] = [
      { status: "off", at: at(-10) },
      { status: "driving", at: at(0) },
      { status: "sleeper", at: at(5) }, // 8 hours
      { status: "driving", at: at(13) }, // 3 hours
      { status: "off", at: at(16) }, // 2 hours — completes the pair
      { status: "driving", at: at(18) },
    ]
    const clocks = computeHos(log, { now: at(19) })
    expect(clocks.usedSleeperSplit).toBe(true)
    expect(clocks.windowStartedAt).toBe(at(13))
    // Since 13:00 → 19:00 is 6 hours, minus the 2-hour qualifying period = 4.
    expect(clocks.shiftRemainingMinutes).toBe(WINDOW_LIMIT_MINUTES - 4 * 60)
    // Driving since 13:00 is 3 + 1 = 4 hours.
    expect(clocks.driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 4 * 60)
  })

  it("accepts the short half first (2 then 8) — the regulation allows either order", () => {
    const log: DutyEvent[] = [
      { status: "off", at: at(-10) },
      { status: "driving", at: at(0) },
      { status: "off", at: at(4) }, // 2 hours
      { status: "driving", at: at(6) },
      { status: "sleeper", at: at(9) }, // 8 hours
      { status: "driving", at: at(17) },
    ]
    const clocks = computeHos(log, { now: at(18) })
    expect(clocks.usedSleeperSplit).toBe(true)
    expect(clocks.windowStartedAt).toBe(at(6))
  })

  it("rejects a 6/4 split — the long half must be at least 7 hours of sleeper", () => {
    const log: DutyEvent[] = [
      { status: "off", at: at(-10) },
      { status: "driving", at: at(0) },
      { status: "sleeper", at: at(5) }, // only 6 hours
      { status: "driving", at: at(11) },
      { status: "off", at: at(13) }, // 4 hours
      { status: "driving", at: at(17) },
    ]
    const clocks = computeHos(log, { now: at(18) })
    expect(clocks.usedSleeperSplit).toBe(false)
    expect(clocks.windowStartedAt).toBe(at(0))
    expect(clocks.violations).toContain("window-14")
  })

  it("rejects a pair that totals under 10 hours (7 + 2 = 9)", () => {
    const log: DutyEvent[] = [
      { status: "off", at: at(-10) },
      { status: "driving", at: at(0) },
      { status: "sleeper", at: at(2) }, // 7 hours
      { status: "driving", at: at(9) },
      { status: "off", at: at(10) }, // 2 hours → 9 total
      { status: "driving", at: at(12) },
    ]
    expect(computeHos(log, { now: at(13) }).usedSleeperSplit).toBe(false)
  })

  it("rejects a 7h OFF-DUTY long half — 395.1(g)(1)(i) requires the sleeper berth", () => {
    const log: DutyEvent[] = [
      { status: "off", at: at(-10) },
      { status: "driving", at: at(0) },
      { status: "off", at: at(3) }, // 7 hours off duty, NOT sleeper
      { status: "driving", at: at(10) },
      { status: "sleeper", at: at(12) }, // 3 hours
      { status: "driving", at: at(15) },
    ]
    const clocks = computeHos(log, { now: at(16) })
    // The 3-hour sleeper is not 7+, and the 7-hour off-duty is not sleeper, so
    // no pair qualifies. (The 10 hours of combined rest never ran consecutively.)
    expect(clocks.usedSleeperSplit).toBe(false)
  })
})

describe("395.3(b) and (c) — cycle limits and the 34-hour restart", () => {
  const dutyDay = (day: number): DutyEvent[] => [
    { status: "on_duty", at: at(day * 24 + 6) },
    { status: "off", at: at(day * 24 + 16) }, // 10 on-duty hours
  ]

  it("70/8 trips at 70 hours of on-duty time", () => {
    // Seven 10-hour days = 70 hours exactly.
    const log = [0, 1, 2, 3, 4, 5, 6].flatMap(dutyDay)
    const clocks = computeHos(log, { now: at(6 * 24 + 17), cycle: 70 })
    expect(clocks.cycleRemainingMinutes).toBe(0)
    expect(clocks.violations).toContain("cycle")
  })

  it("60/7 trips sooner than 70/8 on the same log", () => {
    const log = [0, 1, 2, 3, 4, 5].flatMap(dutyDay) // 60 hours
    const now = at(5 * 24 + 17)
    expect(computeHos(log, { now, cycle: 60 }).violations).toContain("cycle")
    expect(computeHos(log, { now, cycle: 70 }).violations).not.toContain("cycle")
  })

  it("a 34-hour restart zeroes the cycle", () => {
    const log: DutyEvent[] = [
      ...[0, 1, 2, 3, 4, 5, 6].flatMap(dutyDay), // 70 hours used
      { status: "off", at: at(6 * 24 + 16) }, // 34+ hours off
      { status: "on_duty", at: at(8 * 24 + 6) },
    ]
    const clocks = computeHos(log, { now: at(8 * 24 + 8), cycle: 70 })
    // Only the two hours since the restart count.
    expect(clocks.cycleRemainingMinutes).toBe(70 * 60 - 120)
    expect(clocks.violations).not.toContain("cycle")
  })

  it("33 hours off is not a restart", () => {
    const log: DutyEvent[] = [
      ...[0, 1, 2, 3, 4, 5, 6].flatMap(dutyDay),
      { status: "off", at: at(6 * 24 + 16) },
      { status: "on_duty", at: at(6 * 24 + 49) }, // 33 hours
    ]
    expect(computeHos(log, { now: at(6 * 24 + 50), cycle: 70 }).violations).toContain("cycle")
  })

  it("rolls old days out of the window — day 0 stops counting on day 8", () => {
    const log = [0, 1].flatMap(dutyDay)
    // Nine days later, both duty days have aged out of the 8-day window.
    const clocks = computeHos(log, { now: at(10 * 24), cycle: 70 })
    expect(clocks.cycleRemainingMinutes).toBe(70 * 60)
  })
})

describe("395.1(b)(1) — adverse driving conditions", () => {
  it("adds two hours to both the driving limit and the window", () => {
    const log = afterFullBreak([{ status: "driving", at: at(0) }])
    const normal = computeHos(log, { now: at(11) })
    const adverse = computeHos(log, { now: at(11), adverseConditions: true })

    expect(normal.driveRemainingMinutes).toBe(0)
    expect(adverse.driveRemainingMinutes).toBe(ADVERSE_BONUS_MINUTES)
    expect(adverse.shiftRemainingMinutes).toBe(WINDOW_LIMIT_MINUTES + ADVERSE_BONUS_MINUTES - 11 * 60)
  })
})

describe("log hygiene", () => {
  it("sorts events that arrive out of order", () => {
    const scrambled: DutyEvent[] = [
      { status: "driving", at: at(0) },
      { status: "off", at: at(-10) },
    ]
    expect(computeHos(scrambled, { now: at(3) }).windowStartedAt).toBe(at(0))
  })

  it("ignores events in the future relative to the evaluation instant", () => {
    const log = afterFullBreak([
      { status: "driving", at: at(0) },
      { status: "off", at: at(20) }, // hasn't happened yet at now=at(5)
    ])
    expect(computeHos(log, { now: at(5) }).driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 5 * 60)
  })

  it("drops zero-length intervals from a corrected status", () => {
    const log = afterFullBreak([
      { status: "on_duty", at: at(0) },
      { status: "driving", at: at(0) }, // correction at the same instant
    ])
    expect(computeHos(log, { now: at(4) }).driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 4 * 60)
  })

  it("an empty log reports full clocks but flags that the window is not certain", () => {
    const clocks = computeHos([], { now: at(0) })
    expect(clocks.driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES)
    expect(clocks.windowIsCertain).toBe(false)
    expect(clocks.windowStartedAt).toBeNull()
  })

  it("a log with no qualifying break computes from its oldest event and says so", () => {
    const clocks = computeHos([{ status: "driving", at: at(0) }], { now: at(4) })
    expect(clocks.windowIsCertain).toBe(false)
    expect(clocks.windowStartedAt).toBe(at(0))
    expect(clocks.driveRemainingMinutes).toBe(DRIVE_LIMIT_MINUTES - 4 * 60)
  })

  it("rejects an unparseable timestamp rather than silently treating it as epoch", () => {
    expect(() => computeHos([{ status: "driving", at: "not a date" }], { now: at(1) })).toThrow(
      /Invalid HOS timestamp/
    )
  })
})

describe("canDriveFor — the question dispatch actually asks", () => {
  it("approves a run that fits, quoting the available time", () => {
    const result = canDriveFor(afterFullBreak([{ status: "driving", at: at(0) }]), 240, { now: at(2) })
    expect(result.legal).toBe(true)
    expect(result.shortByMinutes).toBe(0)
    expect(result.blockedBy).toBeNull()
    expect(result.reason).toContain("Legal")
  })

  it("names the 30-minute break when that is what is in the way, not the 11", () => {
    // 7h30m driven: 3h30m left on the 11, but only 30 min before the break.
    const result = canDriveFor(afterFullBreak([{ status: "driving", at: at(0) }]), 120, {
      now: at(7, 30),
    })
    expect(result.legal).toBe(false)
    expect(result.blockedBy).toBe("break-30")
    expect(result.shortByMinutes).toBe(90)
    expect(result.reason).toContain("30-minute break")
    expect(result.reason).toContain("30 consecutive minutes off the wheel")
  })

  it("names the cycle — and a 34-hour restart — when the week is what is exhausted", () => {
    const log: DutyEvent[] = [
      ...[0, 1, 2, 3, 4, 5, 6].flatMap((d) => [
        { status: "on_duty" as const, at: at(d * 24 + 6) },
        { status: "off" as const, at: at(d * 24 + 16) },
      ]),
      { status: "on_duty", at: at(7 * 24 + 6) },
    ]
    const result = canDriveFor(log, 60, { now: at(7 * 24 + 7), cycle: 70 })
    expect(result.blockedBy).toBe("cycle")
    expect(result.reason).toContain("34-hour restart")
  })

  it("a run of exactly the available minutes is legal (the boundary is inclusive)", () => {
    const log = afterFullBreak([{ status: "driving", at: at(0) }])
    const available = computeHos(log, { now: at(3) }).availableDriveMinutes
    expect(canDriveFor(log, available, { now: at(3) }).legal).toBe(true)
    expect(canDriveFor(log, available + 1, { now: at(3) }).legal).toBe(false)
  })
})

describe("presentation helpers", () => {
  it("formats minutes the way a driver reads a clock", () => {
    expect(formatHosMinutes(0)).toBe("0m")
    expect(formatHosMinutes(45)).toBe("45m")
    expect(formatHosMinutes(60)).toBe("1h")
    expect(formatHosMinutes(465)).toBe("7h 45m")
    expect(formatHosMinutes(-30)).toBe("0m") // clamped, never a negative clock
    expect(formatHosMinutes(-1)).toBe("0m") // driver-home used to render "-1h -1m"
  })

  it("maps clocks onto the same severity vocabulary the ELD feed uses", () => {
    const level = (nowH: number) =>
      hosLevelFromClocks(computeHos(afterFullBreak([{ status: "driving", at: at(0) }]), { now: at(nowH) }))
    expect(level(1)).toBe("ok")
    expect(level(6)).toBe("warning") // 2h to the break
    expect(level(7.5)).toBe("critical") // 30m to the break
    expect(level(8)).toBe("violation") // break overdue
  })
})
