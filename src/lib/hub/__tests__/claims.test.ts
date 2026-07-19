import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { query, queryOne } from "../db"
import { assertCarrierRefs } from "../tenancy"
import { createClaim, daysToDeadline, getClaim, listClaims, updateClaim } from "../claims"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const refsMock = vi.mocked(assertCarrierRefs)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const CLAIM_ID = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
  refsMock.mockReset()
  refsMock.mockResolvedValue(undefined)
})

describe("listClaims / getClaim tenancy", () => {
  it("always scopes on carrier_id and joins loads/incidents on BOTH carrier sides", async () => {
    await listClaims(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("c.carrier_id = $1")
    expect(String(sql)).toContain("l.carrier_id = c.carrier_id")
    expect(String(sql)).toContain("i.carrier_id = c.carrier_id")
    expect(params).toEqual([CARRIER])
  })

  it("openOnly filters to the statuses the deadline nags apply to", async () => {
    await listClaims(CARRIER, { openOnly: true })
    expect(String(queryMock.mock.calls[0][0])).toContain("c.status IN ('open','filed')")
  })

  it("a status filter is parameterized, never interpolated", async () => {
    await listClaims(CARRIER, { status: "settled" })
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("c.status = $2")
    expect(params).toEqual([CARRIER, "settled"])
  })

  it("getClaim requires carrier_id + id together", async () => {
    await getClaim(CARRIER, CLAIM_ID)
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("c.carrier_id = $1 AND c.id = $2")
    expect(params).toEqual([CARRIER, CLAIM_ID])
  })
})

describe("createClaim", () => {
  it("guards load and incident refs through assertCarrierRefs before inserting", async () => {
    queryMock.mockResolvedValue([{ id: CLAIM_ID }])
    await createClaim(CARRIER, { kind: "cargo", loadId: "load-1", incidentId: "inc-1" })
    expect(refsMock).toHaveBeenCalledWith(CARRIER, { load_id: "load-1", incident_id: "inc-1" })
    const insertSql = String(queryMock.mock.calls[0][0])
    expect(insertSql).toContain("INSERT INTO hub.claims")
  })

  it("defaults status to open and nullable fields to null", async () => {
    queryMock.mockResolvedValue([{ id: CLAIM_ID }])
    await createClaim(CARRIER, { kind: "property" })
    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(params).toEqual([CARRIER, null, null, "property", "open", null, null, null])
  })
})

describe("updateClaim", () => {
  it("returns null (no write) when the claim isn't in this carrier's tenancy", async () => {
    const result = await updateClaim(CARRIER, CLAIM_ID, { status: "filed" })
    expect(result).toBeNull()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("preserves unpatched fields from the current row and re-guards refs", async () => {
    queryOneMock.mockResolvedValue({
      id: CLAIM_ID, carrier_id: CARRIER, incident_id: "inc-1", load_id: "load-1",
      kind: "cargo", status: "open", amount_cents: 125000,
      filing_deadline: "2026-09-01", notes: "keep me",
    })
    queryMock.mockResolvedValue([{ id: CLAIM_ID }])
    await updateClaim(CARRIER, CLAIM_ID, { status: "filed" })
    expect(refsMock).toHaveBeenCalledWith(CARRIER, { load_id: "load-1", incident_id: "inc-1" })
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(params).toEqual([
      CARRIER, CLAIM_ID, "inc-1", "load-1", "cargo", "filed", 125000, "2026-09-01", "keep me",
    ])
  })

  it("an explicit null patch clears a field instead of falling back to the old value", async () => {
    queryOneMock.mockResolvedValue({
      id: CLAIM_ID, carrier_id: CARRIER, incident_id: null, load_id: null,
      kind: "cargo", status: "open", amount_cents: 50000, filing_deadline: null, notes: null,
    })
    queryMock.mockResolvedValue([{ id: CLAIM_ID }])
    await updateClaim(CARRIER, CLAIM_ID, { amountCents: null })
    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(params[6]).toBeNull()
  })
})

describe("daysToDeadline", () => {
  const today = new Date(2026, 6, 19) // Jul 19 2026, local

  it("counts calendar days from today, forward and past-due", () => {
    expect(daysToDeadline("2026-07-19", today)).toBe(0)
    expect(daysToDeadline("2026-08-18", today)).toBe(30)
    expect(daysToDeadline("2026-07-10", today)).toBe(-9)
  })

  it("accepts the local-midnight Date objects pg returns for DATE columns", () => {
    expect(daysToDeadline(new Date(2026, 7, 1), today)).toBe(13)
  })

  it("returns null when no deadline is set", () => {
    expect(daysToDeadline(null, today)).toBeNull()
  })

  it("ignores any time component on an ISO timestamp string", () => {
    expect(daysToDeadline("2026-07-20T23:59:00.000Z", today)).toBe(1)
  })
})
