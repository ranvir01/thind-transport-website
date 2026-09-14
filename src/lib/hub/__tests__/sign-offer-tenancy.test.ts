/**
 * signOffer updated hub.offers by carrier_id + offer id + status='sent'
 * only. signOfferAction received applicantId but dropped it, so a
 * same-carrier offer belonging to applicant X could be signed while
 * applicant Y moved to orientation. Pin the UPDATE to applicant_id
 * (1c leftover from 59eab578 / 55aed814).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { signOffer } from "../recruiting"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const APPLICANT = "33333333-3333-3333-3333-333333333333"
const OTHER_APPLICANT = "44444444-4444-4444-4444-444444444444"
const OFFER = "55555555-5555-5555-5555-555555555555"

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("signOffer", () => {
  it("refuses an applicant_id that is not this carrier's before any UPDATE", async () => {
    await expect(
      signOffer(CARRIER, APPLICANT, OFFER, "sig-bytes", "Pat Lee")
    ).rejects.toThrow("Applicant not found")

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FROM hub.applicants")
    expect(String(sql)).toContain("carrier_id = $1")
    expect(params).toEqual([CARRIER, APPLICANT])
    expect(queryMock.mock.calls.some(([q]) => String(q).includes("UPDATE hub.offers"))).toBe(false)
  })

  it("pins the offer UPDATE to applicant_id after the applicant is proven on this carrier", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("FROM hub.applicants")) return [{ id: APPLICANT }]
      if (String(sql).includes("UPDATE hub.offers")) return [{ id: OFFER }]
      return []
    })

    const ok = await signOffer(CARRIER, APPLICANT, OFFER, "sig-bytes", "Pat Lee")
    expect(ok).toBe(true)

    const lookup = queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.applicants"))
    expect(lookup?.[1]).toEqual([CARRIER, APPLICANT])

    const update = queryMock.mock.calls.find(([sql]) => String(sql).includes("UPDATE hub.offers"))
    expect(update).toBeTruthy()
    expect(String(update![0])).toContain("applicant_id")
    expect(String(update![0])).toContain("carrier_id = $1")
    expect(String(update![0])).toContain("status = 'sent'")
    expect(update![1]).toEqual([CARRIER, OFFER, "sig-bytes", "Pat Lee", APPLICANT])
    expect(queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("FROM hub.applicants")))
      .toBeLessThan(queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("UPDATE hub.offers")))
  })

  it("does not sign when the offer belongs to a different applicant on the same carrier", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("FROM hub.applicants")) return [{ id: OTHER_APPLICANT }]
      return []
    })

    const ok = await signOffer(CARRIER, OTHER_APPLICANT, OFFER, "sig-bytes", "Pat Lee")
    expect(ok).toBe(false)

    const update = queryMock.mock.calls.find(([sql]) => String(sql).includes("UPDATE hub.offers"))
    expect(update).toBeTruthy()
    expect(update![1]).toEqual([CARRIER, OFFER, "sig-bytes", "Pat Lee", OTHER_APPLICANT])
  })
})
