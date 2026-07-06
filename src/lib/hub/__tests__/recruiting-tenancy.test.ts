/**
 * Regression for three tenancy holes in the recruiting/hiring path (1c audit):
 *  - convertApplicantToDriver's offer lookup had no carrier_id filter, so the
 *    most recent offer for an applicant id (from ANY carrier) gated hiring.
 *  - createOffer / attachReferral inserted cross-table refs (applicant_id,
 *    referrer_driver_id) with no ownership check.
 *  - importPublicApplicants pulled from the carrier-less legacy
 *    public.public_applications table for ANY tenant, leaking Thind's real
 *    applicant PII into every other carrier's pipeline.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { query, queryOne } from "../db"
import { assertCarrierRefs } from "../tenancy"
import { attachReferral, convertApplicantToDriver, createOffer, importPublicApplicants } from "../recruiting"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const assertRefsMock = vi.mocked(assertCarrierRefs)

const CARRIER = "22222222-2222-2222-2222-222222222222"
const THIND = "11111111-1111-1111-1111-111111111111"
const APPLICANT = "33333333-3333-3333-3333-333333333333"

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  assertRefsMock.mockClear()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("convertApplicantToDriver", () => {
  it("scopes the offer lookup by carrier_id, not applicant_id alone", async () => {
    // getApplicant (first queryOne call) returns an applicant with orientation done.
    queryOneMock.mockResolvedValueOnce({
      id: APPLICANT,
      orientation: [],
      converted_driver_id: null,
    } as never)
    // offer lookup (second queryOne call) — simulate no signed offer to short-circuit
    // before the transaction, since we're only asserting the query shape here.
    queryOneMock.mockResolvedValueOnce(null)

    await convertApplicantToDriver(
      CARRIER,
      APPLICANT,
      { payType: "per_mile", payRate: 0.55, hireDate: "2026-08-01" },
      { id: "u1", name: "Dispatcher" }
    )

    const offerLookup = queryOneMock.mock.calls[1]
    expect(String(offerLookup[0])).toContain("FROM hub.offers WHERE applicant_id = $1 AND carrier_id = $2")
    expect(offerLookup[1]).toEqual([APPLICANT, CARRIER])
  })
})

describe("createOffer", () => {
  it("validates the applicant belongs to the carrier before inserting", async () => {
    queryMock.mockResolvedValueOnce([{ id: "offer-1" }])
    await createOffer(CARRIER, APPLICANT, { paySummary: "$0.55/mi", startDate: null, body: "..." }, "Dispatcher")
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { applicant_id: APPLICANT })
  })
})

describe("attachReferral", () => {
  it("validates both the applicant and referring driver belong to the carrier", async () => {
    await attachReferral(CARRIER, APPLICANT, "driver-1", 50000)
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { applicant_id: APPLICANT, driver_id: "driver-1" })
  })
})

describe("importPublicApplicants", () => {
  it("no-ops for any carrier other than Thind's own", async () => {
    const result = await importPublicApplicants(CARRIER, "Dispatcher")
    expect(result).toEqual({ imported: 0 })
    expect(queryOneMock).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("still runs for Thind's own carrier id", async () => {
    queryOneMock.mockResolvedValueOnce({ reg: "public.public_applications" } as never)
    queryMock.mockResolvedValueOnce([])
    const result = await importPublicApplicants(THIND, "Owner")
    expect(result).toEqual({ imported: 0 })
    expect(queryOneMock).toHaveBeenCalled()
  })
})
