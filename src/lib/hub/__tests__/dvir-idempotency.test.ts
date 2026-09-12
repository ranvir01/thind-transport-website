/**
 * Offline replay must not file a DVIR twice (TEST_GAPS carry-over from PR #19).
 *
 * The driver app queues a signed inspection when the yard has no signal and
 * replays it later. If the first attempt actually landed but its ACK was
 * lost, the replay used to insert a second DVIR — and an unsafe one grounded
 * the truck again, opened a second work order and paged the office twice.
 * submitDvir now carries the tap's clientRequestId into the insert under the
 * partial unique index from 033; a conflict returns the first row and stops
 * before the grounding branch.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb } from "../db"
import { submitDvir } from "../dvir"

const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const TRUCK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const REQUEST = "7c1c4a6e-2b3d-4f8e-9a0b-1c2d3e4f5a6b"

function mockClient(opts: {
  insertRows: { id: string }[]
  existing?: { id: string; safe_to_operate: boolean; defects: { label: string }[] } | null
}) {
  const calls: { sql: string; params: unknown[] }[] = []
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })
      if (/INSERT INTO hub\.dvirs/.test(sql)) return { rows: opts.insertRows }
      if (/SELECT id, safe_to_operate, defects FROM hub\.dvirs/.test(sql)) {
        return { rows: opts.existing ? [opts.existing] : [] }
      }
      if (/INSERT INTO hub\.maintenance_records/.test(sql)) return { rows: [{ id: "wo-1" }] }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  hubDbMock.mockReturnValue({ connect: async () => client } as never)
  return { client, calls }
}

const UNSAFE_INPUT = {
  truckId: TRUCK,
  driverId: "driver-1",
  type: "post" as const,
  checklist: [],
  defects: [{ label: "Service brakes" }],
  safeToOperate: false,
  signature: "data:image/png;base64,sig",
  signedName: "Test Driver",
  priorDvirId: null,
}

beforeEach(() => {
  hubDbMock.mockReset()
})

describe("submitDvir replay idempotency", () => {
  it("writes the tap's clientRequestId under an ON CONFLICT DO NOTHING on the 033 index", async () => {
    const { calls } = mockClient({ insertRows: [{ id: "dvir-new" }] })
    const result = await submitDvir(CARRIER, { ...UNSAFE_INPUT, clientRequestId: REQUEST })

    const insert = calls.find((c) => /INSERT INTO hub\.dvirs/.test(c.sql))!
    expect(insert.sql).toMatch(/client_request_id\)/)
    expect(insert.sql).toMatch(
      /ON CONFLICT \(carrier_id, client_request_id\) WHERE client_request_id IS NOT NULL DO NOTHING/
    )
    expect(insert.params.at(-1)).toBe(REQUEST)
    expect(result).toEqual({ id: "dvir-new", grounded: true, replayed: false })
  })

  it("sends NULL when the app did not mint an id, so old rows never enter the index", async () => {
    const { calls } = mockClient({ insertRows: [{ id: "dvir-new" }] })
    await submitDvir(CARRIER, UNSAFE_INPUT)
    const insert = calls.find((c) => /INSERT INTO hub\.dvirs/.test(c.sql))!
    expect(insert.params.at(-1)).toBeNull()
  })

  it("on a replay returns the first filing and does not ground the truck a second time", async () => {
    const { calls } = mockClient({
      insertRows: [],
      existing: { id: "dvir-first", safe_to_operate: false, defects: [{ label: "Service brakes" }] },
    })
    const result = await submitDvir(CARRIER, { ...UNSAFE_INPUT, clientRequestId: REQUEST })

    expect(result).toEqual({ id: "dvir-first", grounded: true, replayed: true })
    // The re-select is pinned to this driver and truck, not the id alone.
    const reselect = calls.find((c) => /SELECT id, safe_to_operate, defects FROM hub\.dvirs/.test(c.sql))!
    expect(reselect.sql).toMatch(/client_request_id = \$2 AND driver_id = \$3 AND truck_id = \$4/)
    expect(reselect.params).toEqual([CARRIER, REQUEST, "driver-1", TRUCK])
    // Nothing after the insert touches the truck or the shop.
    expect(calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(false)
    expect(calls.some((c) => /INSERT INTO hub\.maintenance_records/.test(c.sql))).toBe(false)
    expect(calls.some((c) => /UPDATE hub\.dvirs SET repair_work_order_id/.test(c.sql))).toBe(false)
    expect(calls.map((c) => c.sql).filter((s) => s === "COMMIT")).toHaveLength(1)
    expect(calls.some((c) => c.sql === "ROLLBACK")).toBe(false)
  })

  it("reports a replayed clean inspection as not grounded", async () => {
    mockClient({ insertRows: [], existing: { id: "dvir-first", safe_to_operate: true, defects: [] } })
    const result = await submitDvir(CARRIER, {
      ...UNSAFE_INPUT, defects: [], safeToOperate: true, clientRequestId: REQUEST,
    })
    expect(result).toEqual({ id: "dvir-first", grounded: false, replayed: true })
  })

  it("throws (and rolls back) when the id collides with a report that is not this driver's on this truck", async () => {
    const { calls } = mockClient({ insertRows: [], existing: null })
    await expect(submitDvir(CARRIER, { ...UNSAFE_INPUT, clientRequestId: REQUEST })).rejects.toThrow(
      /already filed under another report/
    )
    expect(calls.some((c) => c.sql === "ROLLBACK")).toBe(true)
    expect(calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(false)
  })

  it("replaying twice yields the same id both times", async () => {
    const first = mockClient({ insertRows: [{ id: "dvir-first" }] })
    const a = await submitDvir(CARRIER, { ...UNSAFE_INPUT, clientRequestId: REQUEST })
    expect(first.calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(true)

    const second = mockClient({
      insertRows: [],
      existing: { id: "dvir-first", safe_to_operate: false, defects: [{ label: "Service brakes" }] },
    })
    const b = await submitDvir(CARRIER, { ...UNSAFE_INPUT, clientRequestId: REQUEST })
    expect(second.calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(false)

    expect(b.id).toBe(a.id)
    expect(a.replayed).toBe(false)
    expect(b.replayed).toBe(true)
  })
})
