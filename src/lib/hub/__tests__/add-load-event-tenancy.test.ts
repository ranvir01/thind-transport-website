/**
 * addLoadEvent inserted hub.load_events with a raw load_id and the
 * caller's carrier_id. A cross-tenant load id would land an event row
 * that names one carrier and another carrier's load — the same
 * caller-only shape the check-call action used to have, now at the
 * engine boundary (AGENTS.md: guard both sides of a cross-table write).
 * (1c tenancy leftover from 59eab578 / 2c824092.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query } from "../db"
import { addLoadEvent } from "../loads"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const LOAD = "22222222-2222-2222-2222-222222222222"
const ACTOR = { id: "u1", name: "Dispatcher" }

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
})

describe("addLoadEvent", () => {
  it("refuses a load_id that is not this carrier's before any INSERT", async () => {
    await expect(
      addLoadEvent(CARRIER, LOAD, "note", { note: "probe" }, ACTOR)
    ).rejects.toThrow("Load not found")

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FROM hub.loads")
    expect(String(sql)).toContain("carrier_id = $1")
    expect(String(sql)).toContain("deleted_at IS NULL")
    expect(params).toEqual([CARRIER, LOAD])
    expect(queryMock.mock.calls.some(([q]) => String(q).includes("INSERT INTO hub.load_events"))).toBe(false)
  })

  it("inserts the event only after the load is proven on this carrier", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("FROM hub.loads")) return [{ id: LOAD }]
      return []
    })

    await addLoadEvent(CARRIER, LOAD, "note", { note: "checked in" }, ACTOR)

    const lookup = queryMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.loads"))
    expect(lookup?.[1]).toEqual([CARRIER, LOAD])

    const insert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO hub.load_events")
    )
    expect(insert).toBeTruthy()
    expect(insert![1]).toEqual([
      CARRIER, LOAD, "note", ACTOR.id, ACTOR.name, JSON.stringify({ note: "checked in" }),
    ])
    expect(queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("FROM hub.loads")))
      .toBeLessThan(queryMock.mock.calls.findIndex(([sql]) => String(sql).includes("INSERT INTO hub.load_events")))
  })
})
