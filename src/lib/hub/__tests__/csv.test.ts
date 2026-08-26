import { describe, expect, it } from "vitest"
import { csvEscape, normalizeEquipment, normalizeState, parseCsv, parseDateSafe, parseIntSafe, parseMoney, splitFullName, toCsv } from "../csv"

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

describe("csvEscape", () => {
  // Regression (TEST_GAPS.md #15): a customer/driver name typed as
  // =HYPERLINK(...) or +1-CMD or -2+3 or @SUM(...) would execute as a live
  // formula when the exported CSV is opened in Excel/Sheets. This was three
  // independent implementations (expenses.ts, reports.ts x2, loadboard-export.ts),
  // none of which guarded against it — now a single shared function.
  it("prefixes a leading apostrophe on formula-injection characters", () => {
    expect(csvEscape("=HYPERLINK(http://evil)")).toBe("'=HYPERLINK(http://evil)")
    expect(csvEscape("+1-800-555-0100")).toBe("'+1-800-555-0100")
    expect(csvEscape("-2+3")).toBe("'-2+3")
    expect(csvEscape("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)")
  })

  it("leaves ordinary values untouched", () => {
    expect(csvEscape("Cascade Produce Co.")).toBe("Cascade Produce Co.")
    expect(csvEscape(1234)).toBe("1234")
    expect(csvEscape(null)).toBe("")
    expect(csvEscape(undefined)).toBe("")
  })

  // Regression: a negative P&L/Net cell (e.g. a loss-making truck or lane)
  // is a plain signed decimal, not a formula — apostrophe-prefixing it broke
  // SUM formulas in every downstream spreadsheet by turning the cell to text.
  it("does not prefix plain negative or positive decimals", () => {
    expect(csvEscape("-45.23")).toBe("-45.23")
    expect(csvEscape("-1200")).toBe("-1200")
    expect(csvEscape(-45.23)).toBe("-45.23")
    expect(csvEscape("+45.23")).toBe("+45.23")
  })

  it("still quotes commas, quotes, and newlines (RFC 4180)", () => {
    expect(csvEscape('Smith, "Big Rig" Co.')).toBe('"Smith, ""Big Rig"" Co."')
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"')
  })

  it("quotes AND apostrophe-prefixes a formula value that also needs RFC quoting", () => {
    expect(csvEscape('=A1,"x"')).toBe(`"'=A1,""x"""`)
  })
})

describe("toCsv", () => {
  it("joins headers and escaped rows", () => {
    expect(toCsv(["Name", "Note"], [["Acme", "=cmd()"], ["Beta, Inc", "ok"]])).toBe(
      'Name,Note\nAcme,\'=cmd()\n"Beta, Inc",ok'
    )
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

describe("normalizeState", () => {
  it("passes through jurisdiction codes, upper-casing and trimming", () => {
    expect(normalizeState("wa")).toBe("WA")
    expect(normalizeState("  NE ")).toBe("NE") // Nebraska, not Nevada
    expect(normalizeState("bc")).toBe("BC")
    expect(normalizeState("D.C.")).toBe("DC")
  })

  // Regression: normalizeState was `slice(0, 2)`, which files miles and fuel
  // credit under a real-but-wrong state — the kind of error only an audit finds.
  it("maps full state names to the right code instead of truncating them", () => {
    expect(normalizeState("Minnesota")).toBe("MN") // was "MI" (Michigan)
    expect(normalizeState("Missouri")).toBe("MO") // was "MI"
    expect(normalizeState("Mississippi")).toBe("MS") // was "MI"
    expect(normalizeState("Alaska")).toBe("AK") // was "AL" (Alabama)
    expect(normalizeState("Nevada")).toBe("NV") // was "NE" (Nebraska)
    expect(normalizeState("Montana")).toBe("MT") // was "MO" (Missouri)
    expect(normalizeState("Michigan")).toBe("MI")
    expect(normalizeState("Alabama")).toBe("AL")
    expect(normalizeState("NEW YORK")).toBe("NY")
    expect(normalizeState("west virginia")).toBe("WV")
    expect(normalizeState("British Columbia")).toBe("BC")
  })

  it("maps the traditional spreadsheet abbreviations", () => {
    expect(normalizeState("Minn.")).toBe("MN")
    expect(normalizeState("Nev.")).toBe("NV")
    expect(normalizeState("Mont.")).toBe("MT")
    expect(normalizeState("Tex.")).toBe("TX")
    expect(normalizeState("Calif.")).toBe("CA")
    expect(normalizeState("W. Va.")).toBe("WV")
    expect(normalizeState("Wash.")).toBe("WA")
  })

  it("returns null rather than a wrong-but-valid code for anything unrecognized", () => {
    expect(normalizeState("")).toBeNull()
    expect(normalizeState("   ")).toBeNull()
    expect(normalizeState("XX")).toBeNull()
    expect(normalizeState("N/A")).toBeNull()
    expect(normalizeState("Freeport")).toBeNull() // would have been "FR"
    expect(normalizeState("Mexico")).toBeNull() // would have been "ME" (Maine)
  })
})

describe("splitFullName", () => {
  it("splits First Last, middle names joining the last name", () => {
    expect(splitFullName("Raj Thind")).toEqual({ first: "Raj", last: "Thind" })
    expect(splitFullName("Juan Carlos Reyes")).toEqual({ first: "Juan", last: "Carlos Reyes" })
    expect(splitFullName("  Amar   Gill ")).toEqual({ first: "Amar", last: "Gill" })
  })
  it("splits the comma form as Last, First", () => {
    expect(splitFullName("Thind, Raj")).toEqual({ first: "Raj", last: "Thind" })
    expect(splitFullName("Reyes, Juan Carlos")).toEqual({ first: "Juan Carlos", last: "Reyes" })
  })
  it("returns null when both parts can't be produced", () => {
    expect(splitFullName(undefined)).toBeNull()
    expect(splitFullName("")).toBeNull()
    expect(splitFullName("Cher")).toBeNull()
    expect(splitFullName("Thind,")).toBeNull()
    expect(splitFullName(", Raj")).toBeNull()
  })
})
