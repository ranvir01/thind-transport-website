import { describe, expect, it } from "vitest"
import { normalizeMcNumber } from "../customers"

describe("normalizeMcNumber", () => {
  it("strips an MC- prefix", () => {
    expect(normalizeMcNumber("MC-784512")).toBe("784512")
  })

  it("strips prefix variants: casing, space, #, no separator", () => {
    expect(normalizeMcNumber("mc 651203")).toBe("651203")
    expect(normalizeMcNumber("MC#912844")).toBe("912844")
    expect(normalizeMcNumber("MC447190")).toBe("447190")
    expect(normalizeMcNumber("  Mc - 583321 ")).toBe("583321")
  })

  it("leaves a bare number untouched", () => {
    expect(normalizeMcNumber("784512")).toBe("784512")
  })

  it("returns null for empty, null, or prefix-only input", () => {
    expect(normalizeMcNumber("")).toBeNull()
    expect(normalizeMcNumber("   ")).toBeNull()
    expect(normalizeMcNumber(null)).toBeNull()
    expect(normalizeMcNumber(undefined)).toBeNull()
    expect(normalizeMcNumber("MC-")).toBeNull()
  })
})
