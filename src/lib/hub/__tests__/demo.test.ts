/**
 * Go-live gate: HUB_DEMO_LOGIN=false must identify every seeded demo account —
 * a miss here means printed credentials still work on a production system.
 */
import { afterEach, describe, expect, it } from "vitest"
import { demoLoginEnabled, isDemoEmail } from "../demo"

const ORIGINAL = process.env.HUB_DEMO_LOGIN

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HUB_DEMO_LOGIN
  else process.env.HUB_DEMO_LOGIN = ORIGINAL
})

describe("isDemoEmail", () => {
  it("matches every seeded demo identity, case/space insensitive", () => {
    expect(isDemoEmail("owner@demo.thind")).toBe(true)
    expect(isDemoEmail("dispatch@demo.thind")).toBe(true)
    expect(isDemoEmail("  Driver@Demo.Thind ")).toBe(true)
  })

  it("never flags real accounts", () => {
    expect(isDemoEmail("ranvir@thindtransport.com")).toBe(false)
    expect(isDemoEmail("demo.thind@gmail.com")).toBe(false)
    expect(isDemoEmail(null)).toBe(false)
    expect(isDemoEmail("")).toBe(false)
  })
})

describe("demoLoginEnabled", () => {
  it("defaults on; only the literal 'false' disables it", () => {
    delete process.env.HUB_DEMO_LOGIN
    expect(demoLoginEnabled()).toBe(true)
    process.env.HUB_DEMO_LOGIN = "true"
    expect(demoLoginEnabled()).toBe(true)
    process.env.HUB_DEMO_LOGIN = "false"
    expect(demoLoginEnabled()).toBe(false)
  })
})
