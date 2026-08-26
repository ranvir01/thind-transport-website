/**
 * Regression: nextInvoiceNumber used a bare UPDATE + jsonb_set on
 * '{invoice,nextNumber}'. jsonb_set cannot create a missing invoice parent,
 * and a missing carrier_settings row matched 0 rows — both paths returned
 * INV-1000 every call. The second createInvoiceFromLoad then hit
 * UNIQUE (carrier_id, number). Upsert and seed {invoice} like the other
 * settings writers; throw when RETURNING is empty instead of handing out
 * a colliding number.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { nextInvoiceNumber } from "../settings"

const queryMock = vi.mocked(query)

const CARRIER_ID = "55555555-5555-5555-5555-555555555555"

beforeEach(() => {
  queryMock.mockReset()
})

describe("nextInvoiceNumber", () => {
  it("upserts, seeds the invoice parent, increments nextNumber, and returns the reserved number", async () => {
    queryMock.mockResolvedValueOnce([{ settings: { invoice: { prefix: "THD-INV-", nextNumber: 1002 } } }])

    const number = await nextInvoiceNumber(CARRIER_ID)

    expect(number).toBe("THD-INV-1001")
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("INSERT INTO hub.carrier_settings")
    expect(String(sql)).toContain("ON CONFLICT (carrier_id) DO UPDATE")
    expect(String(sql)).toContain("'{invoice}'")
    expect(String(sql)).toContain("'{invoice,nextNumber}'")
    expect(String(sql)).toContain("RETURNING settings")
    expect(params).toEqual([CARRIER_ID])
  })

  it("uses the default prefix when the stored invoice object has none", async () => {
    queryMock.mockResolvedValueOnce([{ settings: { invoice: { nextNumber: "1001" } } }])
    await expect(nextInvoiceNumber(CARRIER_ID)).resolves.toBe("INV-1000")
  })

  it("throws and does not invent INV-1000 when the upsert matches no row", async () => {
    queryMock.mockResolvedValueOnce([])
    await expect(nextInvoiceNumber(CARRIER_ID)).rejects.toThrow("Could not reserve an invoice number")
  })
})
