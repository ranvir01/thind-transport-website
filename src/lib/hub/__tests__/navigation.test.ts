import { describe, expect, it } from "vitest"
import { isNavActive } from "../navigation"

describe("isNavActive", () => {
  it("highlights Money overview only on the overview route", () => {
    expect(isNavActive("/hub/money", "/hub/money")).toBe(true)
    expect(isNavActive("/hub/money/invoices", "/hub/money")).toBe(false)
    expect(isNavActive("/hub/money/settlements/abc", "/hub/money")).toBe(false)
  })

  it("highlights money sub-pages with prefix match", () => {
    expect(isNavActive("/hub/money/invoices", "/hub/money/invoices")).toBe(true)
    expect(isNavActive("/hub/money/invoices/abc", "/hub/money/invoices")).toBe(true)
    expect(isNavActive("/hub/money", "/hub/money/invoices")).toBe(false)
  })
})
