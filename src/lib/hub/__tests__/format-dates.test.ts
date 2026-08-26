import { describe, expect, it } from "vitest"
import { formatHubDateShort, toIsoDateOnly } from "../format-dates"

describe("toIsoDateOnly", () => {
  it("handles ISO strings", () => {
    expect(toIsoDateOnly("2026-06-15")).toBe("2026-06-15")
  })

  it("handles Postgres Date objects", () => {
    expect(toIsoDateOnly(new Date("2026-06-15T00:00:00.000Z"))).toBe("2026-06-15")
  })

  it("rejects invalid values", () => {
    expect(toIsoDateOnly("not a date")).toBeNull()
    expect(toIsoDateOnly(new Date("Invalid"))).toBeNull()
  })
})

describe("formatHubDateShort", () => {
  it("formats Date objects without Invalid Date", () => {
    const label = formatHubDateShort(new Date("2026-03-20T00:00:00.000Z"))
    expect(label).toMatch(/Mar/)
    expect(label).not.toContain("Invalid")
  })
})
