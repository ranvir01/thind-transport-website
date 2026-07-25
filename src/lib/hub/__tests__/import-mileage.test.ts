/**
 * importMileageAction (TruckX-style IFTA jurisdiction summary).
 *
 * Regressions pinned here:
 * - Re-importing a quarter minted a fresh run_id and INSERTed on top of the
 *   previous run. computeIftaQuarter sums the quarter's source='import' rows,
 *   so two identical 1,000-mile WA files filed WA 2,000 mi — double the miles
 *   and an overpaid fuel tax. An import must REPLACE the quarter's previous
 *   import, in one transaction so a failure can't leave the quarter empty.
 * - normalizeState truncated to two characters, so "Minnesota" was filed as
 *   MI. An unrecognized jurisdiction has to be a row error, not a guess.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Owner", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({ createLoad: vi.fn() }))
vi.mock("@/lib/hub/customers", () => ({ findCustomerByName: vi.fn(), createCustomer: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

const { clientQueryMock, releaseMock, connectMock } = vi.hoisted(() => {
  const clientQueryMock = vi.fn(
    async (_sql: string, _params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> => ({
      rows: [],
      rowCount: 0,
    })
  )
  const releaseMock = vi.fn()
  return {
    clientQueryMock,
    releaseMock,
    connectMock: vi.fn(async () => ({ query: clientQueryMock, release: releaseMock })),
  }
})
vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(() => ({ connect: connectMock })),
}))

import { query } from "@/lib/hub/db"
import { logAudit } from "@/lib/hub/audit"
import { importMileageAction } from "@/app/hub/_actions/import"
import { computeIftaQuarter } from "@/lib/hub/ifta"

const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

/** SQL text + params of every statement run on the transaction client. */
function txCalls(): { sql: string; params: unknown[] }[] {
  return clientQueryMock.mock.calls.map(([sql, params]) => ({
    sql: String(sql ?? ""),
    params: params ?? [],
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  clientQueryMock.mockResolvedValue({ rows: [], rowCount: 0 })
  // truckMap() — unit "101" → t1, "102" → t2.
  queryMock.mockResolvedValue([
    { id: "t1", unit_number: "101" },
    { id: "t2", unit_number: "102" },
  ])
})

describe("importMileageAction replaces a quarter's previous import", () => {
  it("deletes the quarter's prior source='import' rows before inserting the new run", async () => {
    const result = await importMileageAction([
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" },
    ])

    expect(result).toMatchObject({ ok: true, imported: 1, failed: [] })
    const calls = txCalls()
    expect(calls[0].sql).toBe("BEGIN")
    const deleteAt = calls.findIndex((c) => c.sql.includes("DELETE FROM hub.jurisdiction_miles"))
    const insertAt = calls.findIndex((c) => c.sql.includes("INSERT INTO hub.jurisdiction_miles"))
    expect(deleteAt).toBeGreaterThan(-1)
    // Delete must precede the insert, and both must be inside the transaction.
    expect(deleteAt).toBeLessThan(insertAt)
    expect(calls[calls.length - 1].sql).toBe("COMMIT")
    // Carrier-scoped, quarter-scoped, and it never touches the compute's
    // source='pings' audit rows.
    expect(calls[deleteAt].sql).toContain("source = 'import'")
    expect(calls[deleteAt].params).toEqual(["carrier-1", "2026Q2"])
  })

  it("importing the same file twice leaves one run's worth of miles, not two", async () => {
    const file = [{ truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" }]
    await importMileageAction(file)
    const firstRunId = txCalls().find((c) => c.sql.includes("INSERT INTO"))!.params[1]

    vi.clearAllMocks()
    queryMock.mockResolvedValue([{ id: "t1", unit_number: "101" }])
    clientQueryMock.mockResolvedValue({ rows: [], rowCount: 1 })
    await importMileageAction(file)

    const calls = txCalls()
    const inserts = calls.filter((c) => c.sql.includes("INSERT INTO hub.jurisdiction_miles"))
    expect(inserts).toHaveLength(1)
    // A new run id, but the previous run's rows are gone rather than stacked.
    expect(inserts[0].params[1]).not.toBe(firstRunId)
    expect(calls.filter((c) => c.sql.includes("DELETE FROM hub.jurisdiction_miles"))).toHaveLength(1)
  })

  it("only replaces the quarters actually present in the file", async () => {
    await importMileageAction([
      { truck_unit: "101", quarter: "2026Q1", jurisdiction: "WA", miles: "10" },
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "20" },
      { truck_unit: "102", quarter: "2026Q2", jurisdiction: "OR", miles: "30" },
    ])
    const deletes = txCalls().filter((c) => c.sql.includes("DELETE FROM hub.jurisdiction_miles"))
    expect(deletes.map((d) => d.params[1])).toEqual(["2026Q1", "2026Q2"])
  })

  it("rolls back and keeps the quarter's miles on file when an insert fails", async () => {
    clientQueryMock.mockImplementation(async (sql) => {
      if (sql.includes("INSERT INTO hub.jurisdiction_miles")) throw new Error("deadlock detected")
      return { rows: [], rowCount: 0 }
    })

    const result = await importMileageAction([
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" },
    ])

    expect(result.ok).toBe(false)
    expect(result.imported).toBe(0)
    const sqls = txCalls().map((c) => c.sql)
    expect(sqls).toContain("ROLLBACK")
    expect(sqls).not.toContain("COMMIT")
    expect(releaseMock).toHaveBeenCalled()
  })

  it("never opens a transaction when every row failed validation, so bad files can't wipe a quarter", async () => {
    const result = await importMileageAction([
      { truck_unit: "999", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" },
    ])

    expect(result.ok).toBe(false)
    expect(result.imported).toBe(0)
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("audits the replacement, since deleting a quarter's miles moves the fuel-tax number", async () => {
    clientQueryMock.mockResolvedValue({ rows: [], rowCount: 4 })
    await importMileageAction([
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" },
    ])
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierId: "carrier-1",
        entityType: "import",
        action: "import_mileage",
        newValue: expect.objectContaining({ imported: 1, quarters: ["2026Q2"], rowsReplaced: 4 }),
      })
    )
  })
})

/**
 * The double-count regression, reproduced end to end the way it was found:
 * import a file, import it again, then compute the quarter and read the miles.
 * The tests above pin the write path's SQL; these pin the NUMBER a carrier
 * would have filed.
 *
 * hub.jurisdiction_miles is stood up as a tiny in-memory table shared by the
 * import (write) and computeIftaQuarter (read) paths. It honours only the
 * clauses the real SQL actually carries — carrier/quarter/source from the
 * bound parameters, and newest-run-only ONLY when the read asks for it — so
 * dropping either guard from the real code changes what these tests see.
 */
type MileRow = {
  id: number
  carrier_id: string
  run_id: string
  truck_id: string
  quarter: string
  jurisdiction: string
  miles: number
  source: string
}

describe("re-import then compute (the miles a carrier would actually file)", () => {
  let table: MileRow[] = []
  let nextId = 1
  const actor = { id: "u1", name: "Owner" }

  /** Rows the compute read is allowed to see, per the clauses in its SQL. */
  function readImported(sql: string, params: unknown[]): MileRow[] {
    let rows = table.filter((r) => r.carrier_id === params[0] && r.quarter === params[1])
    if (sql.includes("source = 'import'")) rows = rows.filter((r) => r.source === "import")
    // `run_id = (SELECT ... ORDER BY created_at DESC, id DESC LIMIT 1)`: rows
    // are appended in insertion order, so the highest id is the newest run.
    if (/run_id\s*=\s*\(/.test(sql)) {
      const newest = rows.reduce<MileRow | null>((max, r) => (!max || r.id > max.id ? r : max), null)
      rows = newest ? rows.filter((r) => r.run_id === newest.run_id) : []
    }
    return rows
  }

  beforeEach(() => {
    table = []
    nextId = 1
    clientQueryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("DELETE FROM hub.jurisdiction_miles")) {
        const before = table.length
        // Each predicate applies only if the real DELETE actually carries it,
        // so a lost carrier_id or quarter scope shows up as deleted rows here.
        table = table.filter(
          (r) =>
            !(
              (!sql.includes("carrier_id = $1") || r.carrier_id === params[0]) &&
              (!sql.includes("quarter = $2") || r.quarter === params[1]) &&
              (!sql.includes("source = 'import'") || r.source === "import")
            )
        )
        return { rows: [], rowCount: before - table.length }
      }
      if (sql.includes("INSERT INTO hub.jurisdiction_miles")) {
        table.push({
          id: nextId++,
          carrier_id: params[0] as string,
          run_id: params[1] as string,
          truck_id: params[2] as string,
          quarter: params[3] as string,
          jurisdiction: params[4] as string,
          miles: Number(params[5]),
          source: "import",
        })
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM hub.trucks")) return [{ id: "t1", unit_number: "101" }]
      if (sql.includes("FROM hub.jurisdiction_miles") && sql.includes("SUM(miles)")) {
        const summed = new Map<string, { truck_id: string; jurisdiction: string; miles: number }>()
        for (const row of readImported(sql, params)) {
          const key = `${row.truck_id}|${row.jurisdiction}`
          const entry = summed.get(key) ?? { truck_id: row.truck_id, jurisdiction: row.jurisdiction, miles: 0 }
          entry.miles += row.miles
          summed.set(key, entry)
        }
        return [...summed.values()].map((r) => ({ ...r, miles: String(r.miles) }))
      }
      return []
    })
  })

  const file = [{ truck_unit: "101", quarter: "2026Q2", jurisdiction: "WA", miles: "1000" }]

  it("files 1,000 WA miles after the same file is imported twice, not 2,000", async () => {
    await importMileageAction(file)
    await importMileageAction(file)

    const { result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    // The reported repro: two identical 1,000-mile WA rows returned WA 2000.00,
    // which overpays the fuel tax.
    expect(result.fleetMiles).toBe(1000)
    expect(result.rows.find((r) => r.jurisdiction === "WA")!.miles).toBe(1000)
    expect(table).toHaveLength(1)
  })

  it("counts only the newest run when a quarter somehow holds two import runs", async () => {
    // Rows left behind by the pre-fix importer (or any future write path that
    // forgets to replace): the read must not sum them on top of each other.
    table.push(
      { id: nextId++, carrier_id: "carrier-1", run_id: "run-old", truck_id: "t1", quarter: "2026Q2", jurisdiction: "WA", miles: 1000, source: "import" },
      { id: nextId++, carrier_id: "carrier-1", run_id: "run-new", truck_id: "t1", quarter: "2026Q2", jurisdiction: "WA", miles: 1000, source: "import" }
    )

    const { result } = await computeIftaQuarter("carrier-1", "2026Q2", actor)

    expect(result.fleetMiles).toBe(1000)
  })

  it("replaces only this carrier's rows for the quarter in the file", async () => {
    table.push(
      { id: nextId++, carrier_id: "carrier-2", run_id: "other-carrier", truck_id: "t9", quarter: "2026Q2", jurisdiction: "WA", miles: 4000, source: "import" },
      { id: nextId++, carrier_id: "carrier-1", run_id: "older-quarter", truck_id: "t1", quarter: "2026Q1", jurisdiction: "OR", miles: 700, source: "import" },
      { id: nextId++, carrier_id: "carrier-1", run_id: "from-pings", truck_id: "t1", quarter: "2026Q2", jurisdiction: "ID", miles: 55, source: "pings" }
    )

    await importMileageAction(file)

    // Another tenant's miles, another quarter's miles, and the compute's own
    // source='pings' audit rows all survive the replacement.
    expect(table.filter((r) => r.carrier_id === "carrier-2")).toHaveLength(1)
    expect(table.filter((r) => r.quarter === "2026Q1")).toHaveLength(1)
    expect(table.filter((r) => r.source === "pings")).toHaveLength(1)

    const { result } = await computeIftaQuarter("carrier-1", "2026Q1", actor)
    expect(result.fleetMiles).toBe(700)
  })
})

describe("importMileageAction jurisdiction handling", () => {
  it("maps a full state name to the right code instead of truncating it", async () => {
    const result = await importMileageAction([
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "Minnesota", miles: "1000" },
    ])
    expect(result.ok).toBe(true)
    const insert = txCalls().find((c) => c.sql.includes("INSERT INTO hub.jurisdiction_miles"))!
    // "MI" (Michigan) before the fix — the fuel-tax credit went to the wrong state.
    expect(insert.params[4]).toBe("MN")
  })

  it("fails the row instead of filing miles under an unrecognized jurisdiction", async () => {
    const result = await importMileageAction([
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "Freeport", miles: "1000" },
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "", miles: "500" },
      { truck_unit: "101", quarter: "2026Q2", jurisdiction: "OR", miles: "250" },
    ])

    expect(result.ok).toBe(false)
    expect(result.imported).toBe(1)
    expect(result.failed.map((f) => f.row)).toEqual([1, 2])
    expect(result.failed[0].error).toContain("Freeport")
    // The good row still lands.
    const inserts = txCalls().filter((c) => c.sql.includes("INSERT INTO hub.jurisdiction_miles"))
    expect(inserts).toHaveLength(1)
    expect(inserts[0].params[4]).toBe("OR")
  })
})
