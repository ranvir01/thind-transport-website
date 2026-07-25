/**
 * Regression: the "POD in hand, still not invoiced" alarm was measured from
 * hub.loads.updated_at, and hub.loads had no delivery/POD timestamp at all.
 * updated_at moves on ANY edit to the load — a rate correction, a driver swap,
 * a note — so touching an unbilled load reset its own overdue clock: the Today
 * panel showed "delivered 0 days ago" and the 3-day task automation never
 * fired. Migration 022 adds delivered_at / pod_received_at (backfilled from the
 * hub.load_events status_change trail), changeLoadStatus stamps them at the
 * transition, and both readers now age off COALESCE(pod_received_at,
 * delivered_at, updated_at) — updated_at only as the legacy-row fallback.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock, hubDbMock, notifyDriver } = vi.hoisted(() => ({
  queryMock: vi.fn(async (_sql: string, _params?: unknown[]) => [] as unknown[]),
  queryOneMock: vi.fn(async (_sql: string, _params?: unknown[]) => null as unknown),
  hubDbMock: vi.fn(),
  notifyDriver: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock, hubDb: hubDbMock }))
vi.mock("../notify", () => ({ notifyDriver }))
vi.mock("../facilities", () => ({ facilityDedupeKey: vi.fn(() => "key") }))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { changeLoadStatus, createLoad, updateLoad } from "../loads"
import { runTaskAutomations } from "../tasks"
import { todayData } from "../today"

const CARRIER = "11111111-1111-1111-1111-111111111111"
const ANCHOR = "COALESCE(l.pod_received_at, l.delivered_at, l.updated_at)"

/** Every SQL string handed to the mocked query()/queryOne() so far. */
function allSql(): string[] {
  return [...queryMock.mock.calls, ...queryOneMock.mock.calls].map((call) => String(call[0]))
}

/** The one statement that reads unbilled pod_received loads. */
function unbilledSql(): string {
  const matches = allSql().filter(
    (sql) => sql.includes("FROM hub.loads l") && sql.includes("'pod_received'") && sql.includes("hub.invoices i")
  )
  expect(matches).toHaveLength(1)
  return matches[0]
}

/** Records every statement a transaction issues; returns plausible rows for each. */
function makeClient(currentStatus: string | null) {
  const statements: { sql: string; params: unknown[] }[] = []
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    statements.push({ sql, params })
    if (sql.includes("FOR UPDATE")) return { rows: currentStatus ? [{ status: currentStatus }] : [] }
    if (sql.includes("SUBSTRING(reference")) return { rows: [{ max_ref: "1041" }] }
    if (sql.includes("UPDATE hub.loads SET status")) {
      return { rows: [{ id: "load-1", reference: "THD-1042", status: "pod_received", driver_id: null }] }
    }
    if (sql.includes("INSERT INTO hub.loads")) return { rows: [{ id: "load-1", reference: "THD-1042" }] }
    return { rows: [] }
  })
  return { client: { query, release: vi.fn() }, statements }
}

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
  queryMock.mockImplementation(async () => [])
  queryOneMock.mockImplementation(async () => null)
})

describe("Today unbilled panel — POD clock", () => {
  it("ages the unbilled load off the POD stamp, not updated_at", async () => {
    await todayData(CARRIER)
    const sql = unbilledSql()

    expect(sql).toContain(`GREATEST(0, EXTRACT(DAY FROM NOW() - ${ANCHOR}))`)
    expect(sql).not.toContain("EXTRACT(DAY FROM NOW() - l.updated_at)")
  })

  it("orders the panel by the POD stamp so the stalest load is first", async () => {
    await todayData(CARRIER)
    const sql = unbilledSql()

    expect(sql).toContain(`ORDER BY ${ANCHOR}`)
    expect(sql).not.toMatch(/ORDER BY l\.updated_at/)
  })

  it("stays carrier-scoped and only counts loads with no invoice", async () => {
    await todayData(CARRIER)
    const sql = unbilledSql()

    expect(sql).toContain("l.carrier_id = $1")
    expect(sql).toContain("i.carrier_id = l.carrier_id")
  })
})

describe("Task automation — unbilled POD 3-day nag", () => {
  it("measures the 3 days from the POD stamp, not updated_at", async () => {
    await runTaskAutomations(CARRIER)
    const sql = unbilledSql()

    expect(sql).toContain(`AND ${ANCHOR} < NOW() - INTERVAL '3 days'`)
    expect(sql).not.toContain("l.updated_at < NOW() - INTERVAL '3 days'")
  })

  it("still raises the task for a load past the window", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM hub.loads l")) return [{ id: "load-7", reference: "THD-1007" }]
      if (sql.includes("INSERT INTO hub.tasks")) return [{ id: "task-1" }]
      return []
    })

    const result = await runTaskAutomations(CARRIER)

    const insert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.tasks"))!
    expect((insert[1] as unknown[]).at(-1)).toBe("unbilled:load-7")
    expect(result.created).toBe(1)
  })
})

describe("changeLoadStatus stamps the delivery clock", () => {
  it("stamps pod_received_at when the load reaches pod_received", async () => {
    const { client, statements } = makeClient("delivered")
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) })

    await changeLoadStatus(CARRIER, "load-1", "pod_received", { id: "u1", name: "Office" })

    const update = statements.find((s) => s.sql.includes("UPDATE hub.loads SET status"))!
    expect(update.sql).toContain("pod_received_at = CASE WHEN $3::text = 'pod_received' THEN COALESCE(pod_received_at, NOW())")
    expect(update.sql).toContain("delivered_at = CASE WHEN $3::text = 'delivered' THEN COALESCE(delivered_at, NOW())")
    expect(update.params).toEqual([CARRIER, "load-1", "pod_received"])
  })

  it("never overwrites a stamp that is already set (re-marking must not restart the clock)", async () => {
    const { client, statements } = makeClient("pod_received")
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) })

    await changeLoadStatus(CARRIER, "load-1", "pod_received", { id: "u1", name: "Office" })

    const update = statements.find((s) => s.sql.includes("UPDATE hub.loads SET status"))!
    // COALESCE(existing, NOW()) keeps the original stamp; the ELSE branch leaves
    // the other column untouched entirely.
    expect(update.sql).toContain("COALESCE(pod_received_at, NOW()) ELSE pod_received_at END")
    expect(update.sql).toContain("COALESCE(delivered_at, NOW()) ELSE delivered_at END")
  })

  it("leaves both stamps alone on unrelated transitions", async () => {
    const { client, statements } = makeClient("booked")
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) })

    await changeLoadStatus(CARRIER, "load-1", "in_transit", { id: "u1", name: "Dispatcher" })

    const update = statements.find((s) => s.sql.includes("UPDATE hub.loads SET status"))!
    // Only the CASE arms fire, and 'in_transit' matches neither.
    expect(update.sql).toMatch(/delivered_at = CASE WHEN \$3::text = 'delivered'/)
    expect(update.sql).toMatch(/pod_received_at = CASE WHEN \$3::text = 'pod_received'/)
  })
})

describe("editing a load cannot reset its own cash clock", () => {
  // This is the defect itself: updateLoad bumps updated_at on every save, so as
  // long as anything reads updated_at as the clock, a rate correction or a note
  // silences the alarm. The stamps must stay out of updateLoad's SET list — if a
  // later change adds them there, the bug is back and every SQL-shape assertion
  // above still passes.
  it("does not write delivered_at or pod_received_at when the load is edited", async () => {
    queryMock.mockImplementation(async () => [{ id: "load-1" }])

    await updateLoad(CARRIER, "load-1", {
      customer_id: "cust-1",
      equipment: "dry_van",
      linehaul_cents: 100000,
      fuel_surcharge_cents: 0,
      accessorials: [],
    })

    const update = queryMock.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes("UPDATE hub.loads SET"))!
    expect(update).toContain("updated_at=NOW()")
    expect(update).not.toContain("delivered_at")
    expect(update).not.toContain("pod_received_at")
  })
})

describe("both readers share one anchor", () => {
  // The Today panel and the 3-day task nag are the same alarm shown twice. If
  // they drift apart, the office sees "delivered 6 days ago" with no task, or a
  // task for a load the panel calls fresh.
  it("uses the identical COALESCE expression in today.ts and tasks.ts", async () => {
    await todayData(CARRIER)
    const todaySql = unbilledSql()
    queryMock.mockClear()
    queryOneMock.mockClear()

    await runTaskAutomations(CARRIER)
    const tasksSql = unbilledSql()

    expect(todaySql).toContain(ANCHOR)
    expect(tasksSql).toContain(ANCHOR)
  })
})

describe("createLoad stamps a load created straight into a delivered status", () => {
  const input = {
    customer_id: "cust-1",
    equipment: "dry_van" as const,
    linehaul_cents: 100000,
    fuel_surcharge_cents: 0,
    accessorials: [],
    stops: [],
  }

  it("carries the stamps in the insert so new loads never depend on the backfill", async () => {
    const { client, statements } = makeClient(null)
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) })

    await createLoad(CARRIER, { ...input, status: "pod_received" }, { id: "u1", name: "Office" })

    const insert = statements.find((s) => s.sql.includes("INSERT INTO hub.loads"))!
    expect(insert.sql).toContain("delivered_at, pod_received_at")
    expect(insert.sql).toContain("CASE WHEN $5::text = 'delivered' THEN NOW() END")
    expect(insert.sql).toContain("CASE WHEN $5::text = 'pod_received' THEN NOW() END")
    expect((insert.params as unknown[])[4]).toBe("pod_received")
  })

  it("leaves both stamps NULL for an ordinary booked load", async () => {
    const { client, statements } = makeClient(null)
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) })

    await createLoad(CARRIER, input, { id: "u1", name: "Office" })

    const insert = statements.find((s) => s.sql.includes("INSERT INTO hub.loads"))!
    expect((insert.params as unknown[])[4]).toBe("booked")
    // Both CASE arms return NULL for 'booked' — no ELSE branch.
    expect(insert.sql).not.toContain("ELSE NOW()")
  })
})

describe("migration 022", () => {
  const sql = readFileSync(
    join(__dirname, "../../../../migrations/hub/022_load_delivery_timestamps.sql"),
    "utf-8"
  )

  it("adds both columns idempotently", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ")
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS pod_received_at TIMESTAMPTZ")
  })

  it("backfills both stamps from the load_events status_change trail", () => {
    for (const status of ["delivered", "pod_received"]) {
      expect(sql).toContain(`payload->>'to' = '${status}'`)
    }
    // hub.load_events carries 'message', 'document', etc. on the same loads
    // (seed-demo.mjs:835 writes message events), and those rows have no
    // payload->>'to' — both backfill passes must filter on kind first.
    expect(sql.match(/kind = 'status_change'/g)).toHaveLength(2)
    // First entry into the status wins, and the backfill never clobbers a live stamp.
    expect(sql).toContain("MIN(created_at) AS first_at")
    expect(sql).toContain("l.delivered_at IS NULL")
    expect(sql).toContain("l.pod_received_at IS NULL")
    // Cross-table statement: tenancy guarded on both sides.
    expect(sql.match(/ev\.carrier_id = l\.carrier_id/g)).toHaveLength(2)
  })

  it("indexes the unbilled-POD read carrier-first and leaves loads_status_idx alone", () => {
    expect(sql).toContain(
      "ON hub.loads (carrier_id, (COALESCE(pod_received_at, delivered_at, updated_at)))"
    )
    expect(sql).toContain("WHERE deleted_at IS NULL AND status = 'pod_received'")
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS")
    expect(sql).not.toMatch(/DROP INDEX/i)
    expect(sql).not.toMatch(/CREATE INDEX[^;]*loads_status_idx/i)
  })
})
