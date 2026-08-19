/**
 * sendMessage used to INSERT hub.messages with the caller's carrier_id next
 * to an unverified thread_id, then UPDATE hub.message_threads WHERE id AND
 * carrier_id. A foreign thread made that UPDATE a no-op — the message row
 * was already written. INSERT…SELECT from the owned thread (assignFuelToLoad
 * both-sides pattern) is the actual tenancy check.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb } from "../db"
import { sendMessage } from "../messages"

const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const OTHER_CARRIER = "22222222-2222-2222-2222-222222222222"
const THREAD = "33333333-3333-3333-3333-333333333333"
const SENDER = { id: "u1", name: "Dee", role: "dispatcher" }

function makeClient(insertRows: Record<string, unknown>[]) {
  const client = {
    query: vi.fn(async (text: string) => {
      const sql = String(text)
      if (sql.includes("INSERT INTO hub.messages")) return { rows: insertRows }
      if (sql.includes("UPDATE hub.message_threads")) {
        return { rows: insertRows.length ? [{ kind: "direct", load_id: null }] : [] }
      }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) } as never)
  return client
}

beforeEach(() => {
  hubDbMock.mockReset()
})

describe("sendMessage thread ownership", () => {
  it("inserts through a thread-ownership join, not VALUES on a raw thread_id", async () => {
    const client = makeClient([{ id: 1, body: "hello" }])

    await sendMessage(CARRIER, THREAD, { body: "hello", sender: SENDER })

    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.messages"))
    expect(insert).toBeDefined()
    const sql = String(insert![0])
    expect(sql).toContain("FROM hub.message_threads t")
    expect(sql).toContain("WHERE t.id = $2 AND t.carrier_id = $1")
    expect(sql).not.toMatch(/VALUES\s*\(\s*\$1/)
    expect(insert![1]).toEqual([CARRIER, THREAD, SENDER.id, SENDER.name, SENDER.role, "hello", null])
    expect(insert![1]?.[0]).not.toBe(OTHER_CARRIER)
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("COMMIT"))).toBe(true)
  })

  it("rejects a thread the carrier does not own and stores nothing", async () => {
    const client = makeClient([])

    await expect(
      sendMessage(CARRIER, THREAD, { body: "hello", sender: SENDER })
    ).rejects.toThrow("Thread not found")

    const reads = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.message_reads"))
    expect(reads).toBeUndefined()
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("COMMIT"))).toBe(false)
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("ROLLBACK"))).toBe(true)
  })
})
