import { describe, expect, it } from "vitest"
import { normalizeEquipment, parseCsv, parseDateSafe, parseIntSafe, parseMoney } from "../csv"

describe("CSV parser", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,"b,c","say ""hi"""\r\n1,2,3\n')
    expect(rows).toEqual([
      ["a", "b,c", 'say "hi"'],
      ["1", "2", "3"],
    ])
  })

  it("handles newlines inside quotes", () => {
    const rows = parseCsv('"line1\nline2",x')
    expect(rows).toEqual([["line1\nline2", "x"]])
  })
})

describe("field normalizers", () => {
  it("parses spreadsheet money", () => {
    expect(parseMoney('"$3,150.00"'.replace(/"/g, ""))).toBe(3150)
    expect(parseMoney("$340")).toBe(340)
    expect(parseMoney("")).toBe(0)
  })
  it("parses ints and dates safely", () => {
    expect(parseIntSafe("42,000")).toBe(42000)
    expect(parseIntSafe("n/a")).toBeNull()
    expect(parseDateSafe("03/02/2026")).toContain("2026-03-02")
    expect(parseDateSafe("garbage")).toBeNull()
  })
  it("normalizes equipment names", () => {
    expect(normalizeEquipment("53' Reefer")).toBe("reefer")
    expect(normalizeEquipment("Flat bed")).toBe("flatbed")
    expect(normalizeEquipment("Dry Van")).toBe("dry_van")
  })
})
