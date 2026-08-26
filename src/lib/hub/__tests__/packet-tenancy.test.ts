/**
 * Pins the tenancy hard-fail on signBrokerAgreement (AGENTS.md: customer-scoped
 * writes refuse foreign ids). Regression for the hole where a customerId from
 * another carrier soft-fell-back to "Customer" and the agreement PDF, document
 * row, and CRM note were still created against the foreign id.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Thind Transport", dot_number: "123", mc_number: "456", phone: null })),
}))

vi.mock("../documents", () => ({
  saveDocument: vi.fn(async () => ({ id: "doc-1" })),
}))

import { query } from "../db"
import { saveDocument } from "../documents"
import { signBrokerAgreement } from "../packet"

const queryMock = vi.mocked(query)
const saveDocumentMock = vi.mocked(saveDocument)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const FOREIGN_CUSTOMER = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
  saveDocumentMock.mockClear()
})

describe("signBrokerAgreement refuses a customer that is not the carrier's", () => {
  it("hard-fails instead of soft-falling-back to 'Customer'", async () => {
    await expect(
      signBrokerAgreement(
        CARRIER,
        FOREIGN_CUSTOMER,
        { signerName: "Dana", signerTitle: "Dispatcher", signatureDataUrl: "data:image/png;base64," },
        { id: "u1", name: "Priya" }
      )
    ).rejects.toThrow("Customer not found")
  })

  it("the ownership check is carrier-scoped and excludes deleted customers", async () => {
    await signBrokerAgreement(
      CARRIER,
      FOREIGN_CUSTOMER,
      { signerName: "Dana", signerTitle: "Dispatcher", signatureDataUrl: "data:image/png;base64," },
      { id: "u1", name: "Priya" }
    ).catch(() => {})
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("carrier_id = $1 AND id = $2 AND deleted_at IS NULL")
    expect(params).toEqual([CARRIER, FOREIGN_CUSTOMER])
  })

  it("writes nothing for a foreign customer — no document, no CRM note", async () => {
    await signBrokerAgreement(
      CARRIER,
      FOREIGN_CUSTOMER,
      { signerName: "Dana", signerTitle: "Dispatcher", signatureDataUrl: "data:image/png;base64," },
      { id: "u1", name: "Priya" }
    ).catch(() => {})
    expect(saveDocumentMock).not.toHaveBeenCalled()
    // Only the ownership SELECT ran — the CRM INSERT was never reached.
    expect(queryMock).toHaveBeenCalledTimes(1)
  })
})
