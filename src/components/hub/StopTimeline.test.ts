import { describe, expect, it } from "vitest"
import { stopTimingLine, type TimelineStop } from "./StopTimeline"

const baseStop: TimelineStop = {
  id: "s1",
  type: "pickup",
  city: "Kent",
  state: "WA",
  fcfs: false,
  appt_start: null,
  arrived_at: null,
  departed_at: null,
}

describe("stopTimingLine", () => {
  it("shows FCFS alone when nothing has happened yet", () => {
    expect(stopTimingLine({ ...baseStop, fcfs: true })).toBe("FCFS")
  })

  it("shows the appointment time when the stop isn't FCFS", () => {
    expect(stopTimingLine({ ...baseStop, appt_start: "2026-01-05T15:00:00Z" })).toContain("Appt")
  })

  it("is empty when neither FCFS, appointment, arrival, nor departure is set", () => {
    expect(stopTimingLine(baseStop)).toBe("")
  })

  it("never starts with a stray separator when arrived without an appt or FCFS flag", () => {
    const line = stopTimingLine({ ...baseStop, arrived_at: "2026-01-05T15:10:00Z" })
    expect(line.startsWith("·")).toBe(false)
    expect(line).toContain("Arrived")
  })

  it("never starts with a stray separator when departed without an appt or FCFS flag", () => {
    const line = stopTimingLine({
      ...baseStop,
      arrived_at: "2026-01-05T15:10:00Z",
      departed_at: "2026-01-05T16:00:00Z",
    })
    expect(line.startsWith("·")).toBe(false)
    expect(line).toContain("Arrived")
    expect(line).toContain("Departed")
  })

  it("joins every applicable segment with a single separator, in order", () => {
    const line = stopTimingLine({
      ...baseStop,
      fcfs: true,
      arrived_at: "2026-01-05T15:10:00Z",
      departed_at: "2026-01-05T16:00:00Z",
    })
    expect(line.split(" · ")).toEqual([
      "FCFS",
      expect.stringContaining("Arrived"),
      expect.stringContaining("Departed"),
    ])
  })
})
