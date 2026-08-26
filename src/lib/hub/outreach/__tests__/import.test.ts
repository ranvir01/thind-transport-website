import { describe, it, expect } from "vitest"
import { parseProspects } from "../import"

describe("parseProspects", () => {
  it("maps a CSV with a recognizable header row", () => {
    const csv = [
      "name,company,email,phone,lane,equipment",
      "Jane Doe,ACME Logistics,jane@acme.com,555-1212,PNW ↔ CA,reefer",
    ].join("\n")
    const rows = parseProspects(csv, "broker")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      audience: "broker",
      contactName: "Jane Doe",
      company: "ACME Logistics",
      email: "jane@acme.com",
      phone: "555-1212",
      lane: "PNW ↔ CA",
      equipment: "reefer",
    })
  })

  it("handles MC/docket header aliases", () => {
    const csv = "company,mc#,email\nBig Broker,MC-123456,ops@bigbroker.com"
    const [row] = parseProspects(csv, "broker")
    expect(row.mcNumber).toBe("MC-123456")
    expect(row.company).toBe("Big Broker")
  })

  it("auto-detects the email column with no header, any order", () => {
    const rows = parseProspects("Bob Smith, 206-555-9999, bob@shipco.com", "shipper")
    expect(rows[0].email).toBe("bob@shipco.com")
    expect(rows[0].contactName).toBe("Bob Smith")
  })

  it("accepts tab-delimited paste", () => {
    const tsv = "name\temail\nCarl\tcarl@x.com"
    const [row] = parseProspects(tsv, "driver")
    expect(row.email).toBe("carl@x.com")
    expect(row.contactName).toBe("Carl")
  })

  it("lowercases emails and drops rows with no usable signal", () => {
    const csv = ["email", "JANE@ACME.COM", "   ", ",,,"].join("\n")
    const rows = parseProspects(csv, "broker")
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("jane@acme.com")
  })

  it("keeps a company-only row (no email/phone) as a workable prospect", () => {
    const csv = "company\nMystery Freight Co"
    const rows = parseProspects(csv, "shipper")
    expect(rows).toHaveLength(1)
    expect(rows[0].company).toBe("Mystery Freight Co")
    expect(rows[0].email).toBeNull()
  })

  it("returns nothing for empty input", () => {
    expect(parseProspects("", "broker")).toEqual([])
    expect(parseProspects("   \n  \n", "broker")).toEqual([])
  })
})
