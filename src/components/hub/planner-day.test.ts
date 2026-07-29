import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { dayIndex } from "./planner-day"

// Weeks always start Monday (weekStartOf in src/lib/hub/planner.ts), so US DST
// transitions — always a Sunday — land in the LAST column. Spring-forward makes
// that day 23h (harmless to floor math); fall-back makes it 25h, which is the
// case the old elapsed-time implementation mis-bucketed into column 7.
const week = (monday: string): string[] => {
  const [y, m, d] = monday.split("-").map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(y, m - 1, d + i)
    const mm = String(day.getMonth() + 1).padStart(2, "0")
    const dd = String(day.getDate()).padStart(2, "0")
    return `${day.getFullYear()}-${mm}-${dd}`
  })
}

// Node on Linux re-reads process.env.TZ per Date call, so pinning per-suite
// works; restore so nothing leaks if vitest ever shares this worker.
function pinTZ(tz: string) {
  let saved: string | undefined
  beforeAll(() => {
    saved = process.env.TZ
    process.env.TZ = tz
  })
  afterAll(() => {
    if (saved === undefined) delete process.env.TZ
    else process.env.TZ = saved
  })
}

describe("dayIndex in UTC", () => {
  pinTZ("UTC")
  const days = week("2026-03-02")

  it("maps the week's first midnight to column 0", () => {
    expect(dayIndex(days, "2026-03-02T00:00:00")).toBe(0)
  })

  it("maps a mid-week local timestamp to its column", () => {
    expect(dayIndex(days, "2026-03-04T15:00:00")).toBe(2)
  })

  it("accepts Z-suffixed instants (DB timestamps serialize this way)", () => {
    expect(dayIndex(days, "2026-03-08T23:59:59Z")).toBe(6)
  })

  it("returns a negative index before the week (callers Math.max to 0)", () => {
    expect(dayIndex(days, "2026-03-01T23:59:59")).toBe(-1)
  })

  it("returns 7+ after the week (callers Math.min to 6)", () => {
    expect(dayIndex(days, "2026-03-09T00:00:00")).toBe(7)
  })
})

describe("dayIndex in America/Los_Angeles (DST)", () => {
  pinTZ("America/Los_Angeles")

  it("converts Z instants into the viewer's local day", () => {
    // 02:00Z on Mar 5 is 18:00 Mar 4 in LA — column 2, not 3.
    expect(dayIndex(week("2026-03-02"), "2026-03-05T02:00:00Z")).toBe(2)
  })

  describe("spring-forward week (Mon Mar 2 – Sun Mar 8, 2026; clocks jump at 02:00 Mar 8)", () => {
    const days = week("2026-03-02")

    it("keeps the shortened Sunday in column 6 before the jump", () => {
      expect(dayIndex(days, "2026-03-08T00:30:00")).toBe(6)
    })

    it("keeps the shortened Sunday in column 6 after the jump", () => {
      expect(dayIndex(days, "2026-03-08T12:00:00")).toBe(6)
    })
  })

  describe("fall-back week (Mon Oct 26 – Sun Nov 1, 2026; clocks repeat at 02:00 Nov 1)", () => {
    const days = week("2026-10-26")

    it("keeps mid-week columns exact", () => {
      expect(dayIndex(days, "2026-10-28T09:00:00")).toBe(2)
    })

    it("keeps the 25h Sunday's last hour in column 6 (the old floor(elapsed/24h) said 7)", () => {
      // 23:30 local on Nov 1 is 168.5 elapsed hours after Monday midnight.
      expect(dayIndex(days, "2026-11-01T23:30:00")).toBe(6)
    })

    it("still rolls to 7 at the NEXT Monday's midnight, not an hour late", () => {
      expect(dayIndex(days, "2026-11-02T00:00:00")).toBe(7)
    })
  })
})

describe("dayIndex in Asia/Kolkata (half-hour offset, no DST)", () => {
  pinTZ("Asia/Kolkata")
  const days = week("2026-03-02")

  it("maps local timestamps by calendar day despite the :30 offset", () => {
    expect(dayIndex(days, "2026-03-03T00:15:00")).toBe(1)
    // 20:00Z on Mar 3 is 01:30 Mar 4 in Kolkata — already column 2.
    expect(dayIndex(days, "2026-03-03T20:00:00Z")).toBe(2)
  })
})
