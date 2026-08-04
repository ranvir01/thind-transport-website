/**
 * FMCSA Appendix A ELD output-file parser — the universal HOS fallback.
 *
 * The sample file below is shaped per 49 CFR 395 Subpart B Appendix A
 * §4.8.2.1: named section headers, comma-separated records, MMDDYY/HHMMSS in
 * home-terminal time, hex event sequence ids, and a trailing per-line check
 * value. It deliberately carries every hazard the parser claims to survive:
 * an inactive edit-history record, a personal-conveyance indication, a
 * cleared indication, a malformed line, an event for an unknown user, a
 * support (non-driver) account, and a midnight rollover.
 */
import { describe, expect, it } from "vitest"
import { parseEldOutputFile } from "../eld-output-file"
import { computeHos } from "../hos"

// Home terminal at UTC-8 (Kent, WA in winter). Day one: 2026-01-07.
const SAMPLE = [
  "ELD File Header Segment:",
  "Sandhu,Gurjit,GS1201,1,-8,000000",
  "Thind Transport LLC,2523064,WA,checksum1",
  "ELD123,4F2A,checksum2",
  "User List:",
  "1,D,Sandhu,Gurjit,check",
  "2,D,Bains,Amrit,check",
  "3,S,Office,Dispatch,check", // support account: never owns RODS
  "CMV List:",
  "1,TRK102,1FUJGLDR2CLBP8834,check",
  "ELD Event List:",
  // seq,status,origin,type,code,date,time,miles,engHrs,lat,lon,cmv,user,mal,diag,check
  "1,1,2,1,1,010626,220000,0,0,47.38,-122.23,1,1,0,0,a1", // off duty (prior night, 22:00 local)
  "2,1,2,1,4,010726,060000,0,0,47.38,-122.23,1,1,0,0,a2", // on duty 06:00
  "3,1,2,1,3,010726,063000,12,0.4,47.38,-122.23,1,1,0,0,a3", // driving 06:30
  "4,2,2,1,3,010726,061500,12,0.4,47.38,-122.23,1,1,0,0,a4", // INACTIVE edit — ignore
  "5,1,2,1,4,010726,103000,215,4.2,46.21,-119.10,1,1,0,0,a5", // on duty 10:30 (break)
  "6,1,2,1,3,010726,110000,215,4.2,46.21,-119.10,1,1,0,0,a6", // driving 11:00
  "7,1,2,3,1,010726,150000,398,8.0,45.60,-121.20,1,1,0,0,a7", // personal conveyance → off
  "8,1,2,3,0,010726,153000,398,8.0,45.60,-121.20,1,1,0,0,a8", // indication CLEARED → nothing
  "9,1,2,1,1,010726,160000,401,8.1,45.60,-121.20,1,1,0,0,a9", // off duty 16:00
  "A,1,2,1,2,010726,233000,401,8.1,45.60,-121.20,1,1,0,0,aa", // sleeper 23:30 —
  "B,1,2,1,3,010826,003000,401,8.1,45.60,-121.20,1,1,0,0,ab", // midnight rollover: driving 00:30 next day
  "this line is not an event record at all", // malformed → skipped
  "C,1,2,1,3,010726,070000,0,0,0,0,1,9,0,0,ac", // unknown user order 9 → skipped
  "D,1,2,5,1,010726,055500,0,0,0,0,1,1,0,0,ad", // login event (type 5) → out of scope
  "E,1,2,1,4,010726,050000,0,0,47.0,-122.0,1,2,0,0,ae", // co-driver on duty
  "ELD Event Annotations or Comments:",
  "none,check",
  "End of File:",
  "final-check-value",
].join("\r\n")

describe("parseEldOutputFile", () => {
  const result = parseEldOutputFile(SAMPLE)

  it("parses the file and identifies the home-terminal offset", () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.header.utcOffsetHours).toBe(-8)
  })

  it("keeps driver accounts and drops the support account", () => {
    if (!result.ok) return
    const orders = result.drivers.map((d) => d.userOrder).sort()
    expect(orders).toEqual([1, 2])
    const gurjit = result.drivers.find((d) => d.userOrder === 1)!
    expect(gurjit.lastName).toBe("Sandhu")
  })

  it("maps duty codes, honors PC→off, ignores cleared indications and inactive edits", () => {
    if (!result.ok) return
    const events = result.drivers.find((d) => d.userOrder === 1)!.events
    expect(events.map((e) => e.status)).toEqual([
      "off", // prior night
      "on_duty", // 06:00
      "driving", // 06:30 — the 06:15 inactive edit is NOT here
      "on_duty", // 10:30
      "driving", // 11:00
      "off", // 15:00 personal conveyance
      "off", // 16:00 explicit off (cleared indication emitted nothing)
      "sleeper", // 23:30
      "driving", // 00:30 next day — rollover sorted correctly
    ])
  })

  it("converts home-terminal local time to real UTC instants", () => {
    if (!result.ok) return
    const events = result.drivers.find((d) => d.userOrder === 1)!.events
    // 06:00 local at UTC-8 is 14:00Z the same day.
    expect(events[1]!.at).toBe("2026-01-07T14:00:00.000Z")
    // 00:30 local on Jan 8 at UTC-8 is 08:30Z on Jan 8.
    expect(events[8]!.at).toBe("2026-01-08T08:30:00.000Z")
  })

  it("counts malformed and unattributable lines instead of failing the file", () => {
    if (!result.ok) return
    // The prose line + the unknown-user line. The login event and the cleared
    // indication are out of scope, not skips.
    expect(result.skippedLines).toBe(2)
  })

  it("the parsed log drives computeHos — the whole point of the fallback", () => {
    if (!result.ok) return
    const events = result.drivers.find((d) => d.userOrder === 1)!.events
    // One hour into the post-rollover drive: 01:30 local = 09:30Z.
    const clocks = computeHos(events, { now: "2026-01-08T09:30:00.000Z", cycle: 70 })
    // The 23:30→00:30 sleeper hour is only 1h — not a 10h reset, and not a
    // valid split — so the window that began at 06:00 the previous day is
    // long since blown while the driver is driving again.
    expect(clocks.shiftRemainingMinutes).toBe(0)
    expect(clocks.violations).toContain("window-14")
  })
})

describe("fail-safe behaviour on non-files", () => {
  it("empty input names the missing header", () => {
    const r = parseEldOutputFile("")
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Header") })
  })

  it("an ordinary CSV is refused, not half-parsed", () => {
    const r = parseEldOutputFile("date,truck,gallons\n2026-01-07,102,118.4\n")
    expect(r.ok).toBe(false)
  })

  it("a header with no event section is refused with a reason", () => {
    const r = parseEldOutputFile("ELD File Header Segment:\nSandhu,Gurjit,GS1201,1,-8\nUser List:\n1,D,Sandhu,Gurjit,c\n")
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Event List") })
  })

  it("an event list with only inactive records is refused", () => {
    const file = [
      "ELD File Header Segment:",
      "Sandhu,Gurjit,GS1201,1,-8,0",
      "User List:",
      "1,D,Sandhu,Gurjit,c",
      "ELD Event List:",
      "1,2,2,1,3,010726,060000,0,0,0,0,1,1,0,0,c", // inactive
      "End of File:",
    ].join("\n")
    const r = parseEldOutputFile(file)
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("no active") })
  })
})
