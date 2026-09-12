/**
 * Offline replay must not file an incident twice (TEST_GAPS carry-over from
 * PR #19). A crash scene is where signal dies; the first report queues and
 * replays. If the first attempt landed but its ACK was lost, the replay used
 * to insert a second report and page the office about a second crash.
 * createIncident now carries the tap's clientRequestId into the insert under
 * the partial unique index from 033; a conflict returns the first row.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { query, queryOne } from "../db"
import { createIncident } from "../incidents"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const REQUEST = "7c1c4a6e-2b3d-4f8e-9a0b-1c2d3e4f5a6b"
const REPORTER = { id: "u1", name: "Sam Driver" }

const input = {
  driverId: "driver-1",
  truckId: null,
  loadId: null,
  occurredAt: "2026-09-12T10:00:00Z",
  location: "I-90 MP 112",
  description: "Rear-ended at a light",
  fatality: false,
  injuryTreatedAway: false,
  towAwayDisabling: false,
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("createIncident replay idempotency", () => {
  it("writes the tap's clientRequestId under an ON CONFLICT DO NOTHING on the 033 index", async () => {
    queryMock.mockResolvedValueOnce([{ id: "inc-new" }] as never)
    const result = await createIncident(CARRIER, { ...input, clientRequestId: REQUEST }, REPORTER)

    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toMatch(/reported_by, reported_by_name, client_request_id/)
    expect(String(sql)).toMatch(
      /ON CONFLICT \(carrier_id, client_request_id\) WHERE client_request_id IS NOT NULL DO NOTHING/
    )
    expect(params?.at(-1)).toBe(REQUEST)
    expect(result).toEqual({ id: "inc-new", replayed: false })
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("sends NULL from the office form, so those rows never enter the index", async () => {
    queryMock.mockResolvedValueOnce([{ id: "inc-new" }] as never)
    await createIncident(CARRIER, input, REPORTER)
    expect(queryMock.mock.calls[0][1]?.at(-1)).toBeNull()
  })

  it("on a replay returns the first filing, re-selected for the same reporter", async () => {
    queryMock.mockResolvedValueOnce([])
    queryOneMock.mockResolvedValueOnce({ id: "inc-first", location: "I-90 MP 112" } as never)

    const result = await createIncident(CARRIER, { ...input, clientRequestId: REQUEST }, REPORTER)

    expect(result).toEqual({ id: "inc-first", location: "I-90 MP 112", replayed: true })
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toMatch(/i\.carrier_id = \$1 AND i\.client_request_id = \$2 AND i\.reported_by = \$3/)
    expect(params).toEqual([CARRIER, REQUEST, "u1"])
    // One insert, nothing else written.
    expect(queryMock).toHaveBeenCalledTimes(1)
  })

  it("throws when the id collides with a report filed by another account", async () => {
    queryMock.mockResolvedValueOnce([])
    queryOneMock.mockResolvedValueOnce(null)
    await expect(
      createIncident(CARRIER, { ...input, clientRequestId: REQUEST }, REPORTER)
    ).rejects.toThrow(/already filed under another account/)
  })

  it("an empty insert with no clientRequestId does not go looking for a prior row", async () => {
    queryMock.mockResolvedValueOnce([])
    await createIncident(CARRIER, input, REPORTER)
    expect(queryOneMock).not.toHaveBeenCalled()
  })
})
