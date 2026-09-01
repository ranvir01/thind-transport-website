/**
 * House rule: a new table gets a tenant-isolation test.
 *
 * hub.intake_drafts is addressed by a UUID that arrives from the URL, so
 * `WHERE id = $1` alone would let one carrier open, book, or dismiss another
 * carrier's mail. Every query here must carry carrier_id in SQL — never a
 * filter applied in JS after the rows come back.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import {
  createIntakeDraft,
  getIntakeDraft,
  listIntakeDrafts,
  pendingIntakeCount,
  resolveIntakeDraft,
} from "../intake-drafts"
import type { ParsedRateCon } from "../parser"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER = "22222222-2222-2222-2222-222222222222"
const DRAFT = "33333333-3333-3333-3333-333333333333"
const PARSED: ParsedRateCon = { stops: [] }

/** Normalizes whitespace so the assertions read like the SQL, not the gutter. */
function sqlOf(call: [unknown, ...unknown[]]): string {
  return String(call[0]).replace(/\s+/g, " ")
}

describe("intake-drafts tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryMock.mockResolvedValue([])
    queryOneMock.mockResolvedValue(null)
  })

  it("scopes every read to the carrier, in SQL, with the carrier as $1", async () => {
    await listIntakeDrafts(CARRIER)
    await getIntakeDraft(CARRIER, DRAFT)
    await pendingIntakeCount(CARRIER)

    const calls = [...queryMock.mock.calls, ...queryOneMock.mock.calls] as [string, unknown[]][]
    expect(calls).toHaveLength(3)
    for (const call of calls) {
      expect(sqlOf(call)).toMatch(/carrier_id = \$1/)
      expect((call[1] as unknown[])[0]).toBe(CARRIER)
    }
  })

  it("never joins hub.documents without a carrier guard on the join side", async () => {
    await listIntakeDrafts(CARRIER)
    const sql = sqlOf(queryMock.mock.calls[0] as [string, unknown[]])
    expect(sql).toContain("LEFT JOIN hub.documents")
    expect(sql).toMatch(/d\.carrier_id = i\.carrier_id/)
  })

  it("writes the carrier onto every new draft", async () => {
    queryMock.mockResolvedValue([{ id: DRAFT }] as never)
    await createIntakeDraft({ carrierId: CARRIER, parsed: PARSED, confidence: "low" })
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(String(sql)).toContain("INSERT INTO hub.intake_drafts")
    expect(params[0]).toBe(CARRIER)
  })

  it("cannot resolve another carrier's draft even with the right draft id", async () => {
    queryMock.mockResolvedValue([])
    const ok = await resolveIntakeDraft({ carrierId: OTHER, id: DRAFT, status: "dismissed" })
    expect(ok).toBe(false)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(sqlOf([sql, params])).toMatch(/WHERE carrier_id = \$1 AND id = \$2/)
    expect(params[0]).toBe(OTHER)
  })

  it("only resolves a draft that is still pending, so a double-accept is a no-op", async () => {
    queryMock.mockResolvedValue([])
    const ok = await resolveIntakeDraft({
      carrierId: CARRIER, id: DRAFT, status: "accepted", createdLoadId: "load-1",
    })
    expect(ok).toBe(false)
    expect(sqlOf(queryMock.mock.calls[0] as [string, unknown[]])).toContain("status = 'pending'")
  })

  it("reports success only when a row actually came back", async () => {
    queryMock.mockResolvedValue([{ id: DRAFT }] as never)
    await expect(
      resolveIntakeDraft({ carrierId: CARRIER, id: DRAFT, status: "accepted", createdLoadId: "load-1" })
    ).resolves.toBe(true)
  })

  it("truncates a runaway raw_text instead of writing an unbounded row", async () => {
    queryMock.mockResolvedValue([{ id: DRAFT }] as never)
    await createIntakeDraft({
      carrierId: CARRIER, parsed: PARSED, confidence: "low", rawText: "x".repeat(60000),
    })
    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(String(params[4])).toHaveLength(40000)
  })
})
