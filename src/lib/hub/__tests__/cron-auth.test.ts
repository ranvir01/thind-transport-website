import { describe, expect, it } from "vitest"
import { cronAuthorized } from "../cron-auth"

describe("cron auth", () => {
  it("rejects when CRON_SECRET is missing", () => {
    expect(cronAuthorized("Bearer anything", undefined)).toBe(false)
    expect(cronAuthorized("Bearer anything", "")).toBe(false)
  })

  it("rejects missing, malformed, or wrong tokens", () => {
    expect(cronAuthorized(null, "secret")).toBe(false)
    expect(cronAuthorized("secret", "secret")).toBe(false)
    expect(cronAuthorized("Bearer wrong", "secret")).toBe(false)
  })

  it("accepts exact bearer token match only", () => {
    expect(cronAuthorized("Bearer secret", "secret")).toBe(true)
    expect(cronAuthorized("Bearer secret ", "secret")).toBe(false)
  })
})
