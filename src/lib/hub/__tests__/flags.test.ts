/**
 * Flag resolution — the specificity ladder is the whole contract:
 * user > carrier+role > role(all) > carrier > global > code default.
 */
import { describe, expect, it } from "vitest"
import { resolveFlagValue, FLAG_REGISTRY } from "../flags"

const ctx = { carrierId: "c1", userId: "u1", role: "dispatcher" }
const row = (scope: string, over: Record<string, unknown> = {}) => ({
  scope: scope as "global" | "carrier" | "role" | "user",
  carrier_id: null, role: null, user_id: null, value: true, ...over,
})

describe("resolveFlagValue", () => {
  it("falls back to the code default with no rows", () => {
    expect(resolveFlagValue("nav.small_carrier_mode", [], ctx)).toBe(
      FLAG_REGISTRY["nav.small_carrier_mode"].defaultValue
    )
  })

  it("global overrides the default; carrier overrides global", () => {
    expect(resolveFlagValue("nav.small_carrier_mode", [row("global", { value: false })], ctx)).toBe(false)
    expect(
      resolveFlagValue(
        "nav.small_carrier_mode",
        [row("global", { value: false }), row("carrier", { carrier_id: "c1", value: true })],
        ctx
      )
    ).toBe(true)
  })

  it("carrier+role beats all-tenant role beats carrier; user beats everything", () => {
    const rows = [
      row("carrier", { carrier_id: "c1", value: false }),
      row("role", { role: "dispatcher", carrier_id: null, value: false }),
      row("role", { role: "dispatcher", carrier_id: "c1", value: true }),
    ]
    expect(resolveFlagValue("nav.small_carrier_mode", rows, ctx)).toBe(true)
    expect(
      resolveFlagValue(
        "nav.small_carrier_mode",
        [...rows, row("user", { user_id: "u1", value: false })],
        ctx
      )
    ).toBe(false)
  })

  it("another carrier's row never leaks in", () => {
    expect(
      resolveFlagValue("nav.small_carrier_mode", [row("carrier", { carrier_id: "OTHER", value: false })], ctx)
    ).toBe(FLAG_REGISTRY["nav.small_carrier_mode"].defaultValue)
  })

  it("non-boolean values read as false, never as accidental true", () => {
    expect(resolveFlagValue("nav.small_carrier_mode", [row("global", { value: "yes" })], ctx)).toBe(false)
  })
})
