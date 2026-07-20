import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
// @ts-expect-error — plain .mjs script module without type declarations
import {
  expandCronField,
  firingsPerMatchingDay,
  exceedsHobbyDailyLimit,
  hobbyIllegalCrons,
  exceedsHobbyJobCount,
  MAX_CRON_JOBS_PER_PROJECT,
} from "../../../scripts/hobby-cron-guard.mjs"

describe("expandCronField", () => {
  it("expands * across the span", () => {
    expect(expandCronField("*", 0, 2)).toEqual([0, 1, 2])
  })

  it("expands a single value, list, range, and step", () => {
    expect(expandCronField("15", 0, 59)).toEqual([15])
    expect(expandCronField("0,15,30", 0, 59)).toEqual([0, 15, 30])
    expect(expandCronField("1-3", 0, 23)).toEqual([1, 2, 3])
    expect(expandCronField("*/15", 0, 59)).toEqual([0, 15, 30, 45])
    expect(expandCronField("10-20/5", 0, 59)).toEqual([10, 15, 20])
  })
})

describe("firingsPerMatchingDay / exceedsHobbyDailyLimit", () => {
  it("treats a single minute+hour as once daily (Hobby-safe)", () => {
    expect(firingsPerMatchingDay("0 15 * * *")).toBe(1)
    expect(firingsPerMatchingDay("30 14 * * *")).toBe(1)
    expect(firingsPerMatchingDay("0 13 * * 1")).toBe(1)
    expect(firingsPerMatchingDay("0 10 1 * *")).toBe(1)
    expect(exceedsHobbyDailyLimit("0 15 * * *")).toBe(false)
  })

  it("flags hourly, every-N-minutes, and multi-hour schedules", () => {
    expect(firingsPerMatchingDay("0 * * * *")).toBe(24)
    expect(firingsPerMatchingDay("*/30 * * * *")).toBe(48)
    expect(firingsPerMatchingDay("*/15 * * * *")).toBe(96)
    expect(firingsPerMatchingDay("0 6,12,18 * * *")).toBe(3)
    expect(exceedsHobbyDailyLimit("0 * * * *")).toBe(true)
  })
})

describe("hobbyIllegalCrons (vercel.json)", () => {
  it("returns the illegal entries with path + schedule", () => {
    const illegal = hobbyIllegalCrons({
      crons: [
        { path: "/api/hub/cron/ok", schedule: "0 12 * * *" },
        { path: "/api/hub/cron/bad", schedule: "0 * * * *" },
      ],
    })
    expect(illegal).toEqual([
      { path: "/api/hub/cron/bad", schedule: "0 * * * *", firingsPerDay: 24 },
    ])
  })

  it("keeps the repo's vercel.json Hobby-safe (the deploy-blocker regression)", () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf-8")
    )
    expect(hobbyIllegalCrons(vercel)).toEqual([])
  })
})

describe("exceedsHobbyJobCount (vercel.json)", () => {
  it("is false under the per-project cap and true over it", () => {
    const under = { crons: Array.from({ length: MAX_CRON_JOBS_PER_PROJECT }, (_, i) => ({ path: `/api/${i}`, schedule: "0 0 * * *" })) }
    const over = { crons: Array.from({ length: MAX_CRON_JOBS_PER_PROJECT + 1 }, (_, i) => ({ path: `/api/${i}`, schedule: "0 0 * * *" })) }
    expect(exceedsHobbyJobCount(under)).toBe(false)
    expect(exceedsHobbyJobCount(over)).toBe(true)
    expect(exceedsHobbyJobCount({})).toBe(false)
    expect(exceedsHobbyJobCount(undefined)).toBe(false)
  })

  it("keeps the repo's vercel.json under the per-project job cap", () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf-8")
    )
    expect(exceedsHobbyJobCount(vercel)).toBe(false)
  })
})
