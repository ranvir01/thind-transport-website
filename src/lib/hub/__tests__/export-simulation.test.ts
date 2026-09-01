/**
 * Money CSVs pick up the same SIMULATION banner as PDFs so a QuickBooks
 * import of generated numbers cannot land in a real book.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null), hubDb: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "../db"
import { exportCsv } from "../expenses"

const queryMock = vi.mocked(query)
const ORIGINAL = process.env.HAULDESK_MODE

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([
    { number: "INV-1", customer: "Acme", load: "LD-1", issued_on: "2026-07-04", due_on: "2026-08-03", amount: 100, status: "open", factored: false },
  ])
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HAULDESK_MODE
  else process.env.HAULDESK_MODE = ORIGINAL
})

describe("exportCsv simulation wrap", () => {
  it("prefixes the filename and banners the first row in simulation", async () => {
    process.env.HAULDESK_MODE = "simulation"
    const { filename, csv } = await exportCsv("11111111-1111-1111-1111-111111111111", "invoices")
    expect(filename).toBe("SIMULATION-invoices.csv")
    expect(csv.startsWith('"SIMULATION — NOT A REAL DOCUMENT"\n')).toBe(true)
    expect(csv).toContain("INV-1")
  })

  it("leaves legit exports unprefixed", async () => {
    process.env.HAULDESK_MODE = "legit"
    const { filename, csv } = await exportCsv("11111111-1111-1111-1111-111111111111", "invoices")
    expect(filename).toBe("invoices.csv")
    expect(csv).not.toContain("NOT A REAL DOCUMENT")
  })
})
