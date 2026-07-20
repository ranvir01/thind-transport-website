/**
 * Portal-subsystem audit: /api/hub/files/[name] used to serve ANY same-carrier
 * file to external broker/shipper accounts — settlement statements, CDL scans,
 * and other customers' invoices included. portalFileVisible is the ACL that
 * closed it: an external account may only fetch what the portal itself
 * surfaces for THEIR customer (POD/BOL on their loads, the carrier packet
 * docs, their invoice PDFs), and only while the account is still active.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { queryOne } from "../db"
import { portalFileVisible } from "../portal"

const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const CUSTOMER = "cccccccc-cccc-cccc-cccc-cccccccccccc"

beforeEach(() => {
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("portalFileVisible", () => {
  it("resolves the account with the broker/shipper + active guard, scoped to the carrier", async () => {
    await portalFileVisible(CARRIER, USER, "pod.pdf")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("role IN ('broker','shipper') AND active")
    expect(String(sql)).toContain("id = $1 AND carrier_id = $2")
    expect(params).toEqual([USER, CARRIER])
  })

  it("refuses when the account is missing, deactivated, or unlinked — without running the claim query", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    expect(await portalFileVisible(CARRIER, USER, "pod.pdf")).toBe(false)
    queryOneMock.mockResolvedValueOnce({ customer_id: null })
    expect(await portalFileVisible(CARRIER, USER, "pod.pdf")).toBe(false)
    expect(queryOneMock).toHaveBeenCalledTimes(2)
  })

  it("checks the claim against the three portal-visible producers, customer-scoped, basename-flattened", async () => {
    queryOneMock
      .mockResolvedValueOnce({ customer_id: CUSTOMER })
      .mockResolvedValueOnce(null)
    const visible = await portalFileVisible(CARRIER, USER, "../../etc/secret.pdf")
    expect(visible).toBe(false)
    const [sql, params] = queryOneMock.mock.calls[1]
    const text = String(sql)
    // POD/BOL on THEIR loads, with the both-sides join guard.
    expect(text).toContain("JOIN hub.loads l ON l.id = d.entity_id AND d.entity_type = 'load' AND l.carrier_id = d.carrier_id")
    expect(text).toContain("d.kind IN ('pod','bol')")
    expect(text).toContain("l.customer_id = $3")
    // Carrier packet docs.
    expect(text).toContain("kind IN ('insurance','w9','authority_letter')")
    // THEIR invoices only — and settlements are never portal-visible.
    expect(text).toContain("pdf_url = $1 AND carrier_id = $2 AND customer_id = $3")
    expect(text).not.toContain("settlements")
    expect(params).toEqual(["/api/hub/files/secret.pdf", CARRIER, CUSTOMER])
  })

  it("allows a file one of the producers claims for their customer", async () => {
    queryOneMock
      .mockResolvedValueOnce({ customer_id: CUSTOMER })
      .mockResolvedValueOnce({ ok: 1 })
    expect(await portalFileVisible(CARRIER, USER, "pod.pdf")).toBe(true)
  })
})
