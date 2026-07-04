/**
 * SQL-shape tests pinning the join-side carrier guard on read queries
 * (AGENTS.md: cross-table references match carrier_id on BOTH sides, not
 * just the WHERE clause — defense-in-depth against same-id rows from a
 * foreign carrier leaking labels through id-only joins).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { query, queryOne } from "../db"
import { listFuelTransactions } from "../fuel"
import { listIncidents } from "../incidents"
import { getThread, listMessages, listThreadsForOffice, threadReads } from "../messages"
import { listLoads } from "../loads"
import { listTrucks, latestTruckPositions } from "../fleet"
import { listApplicants } from "../recruiting"
import { listAdvances, listSettlements, escrowBalances } from "../settlements"
import { listCustomers } from "../customers"
import { listTasks } from "../tasks"
import { listFacilityNotes } from "../facilities"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"

/** SQL of the most recent query/queryOne call, then reset so calls can't interleave. */
function lastSql(): string {
  const calls = [...queryMock.mock.calls, ...queryOneMock.mock.calls]
  queryMock.mockClear()
  queryOneMock.mockClear()
  return String(calls[calls.length - 1][0])
}

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
})

describe("read queries carrier-guard their joins (both-sides tenancy)", () => {
  it("fuel list guards truck/driver/load joins", async () => {
    await listFuelTransactions(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON t.id = f.truck_id AND t.carrier_id = f.carrier_id")
    expect(sql).toContain("ON d.id = f.driver_id AND d.carrier_id = f.carrier_id")
    expect(sql).toContain("ON l.id = f.load_id AND l.carrier_id = f.carrier_id")
  })

  it("incidents list guards truck/driver/load joins", async () => {
    await listIncidents(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON t.id = i.truck_id AND t.carrier_id = i.carrier_id")
    expect(sql).toContain("ON d.id = i.driver_id AND d.carrier_id = i.carrier_id")
    expect(sql).toContain("ON l.id = i.load_id AND l.carrier_id = i.carrier_id")
  })

  it("message thread reads guard load/driver/document joins", async () => {
    await getThread(CARRIER, "t1")
    expect(lastSql()).toContain("ON l.id = t.load_id AND l.carrier_id = t.carrier_id")
    await listThreadsForOffice(CARRIER, "u1")
    expect(lastSql()).toContain("ON ld.id = l.driver_id AND ld.carrier_id = t.carrier_id")
    await listMessages(CARRIER, "t1")
    expect(lastSql()).toContain("ON doc.id = m.document_id AND doc.carrier_id = m.carrier_id")
    await threadReads(CARRIER, "t1")
    const readsSql = lastSql()
    expect(readsSql).toContain("JOIN hub.message_threads t ON t.id = r.thread_id AND t.carrier_id = $1")
    expect(readsSql).toContain("JOIN hub.users u ON u.id = r.user_id AND u.carrier_id = t.carrier_id")
  })

  it("load list guards customer/driver/truck/trailer joins and lateral subqueries", async () => {
    await listLoads(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON c.id = l.customer_id AND c.carrier_id = l.carrier_id")
    expect(sql).toContain("ON tr.id = l.trailer_id AND tr.carrier_id = l.carrier_id")
    expect(sql).toContain("WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup'")
    expect(sql).toContain("WHERE entity_type = 'load' AND entity_id = l.id AND carrier_id = l.carrier_id")
    expect(sql).toContain("FROM hub.invoices WHERE load_id = l.id AND carrier_id = l.carrier_id")
  })

  it("fleet reads guard assigned-driver and position joins", async () => {
    await listTrucks(CARRIER)
    expect(lastSql()).toContain("ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id")
    await latestTruckPositions(CARRIER)
    expect(lastSql()).toContain("ON t.id = p.truck_id AND t.carrier_id = p.carrier_id")
  })

  it("applicant list guards referral/referrer joins and offers subquery", async () => {
    await listApplicants(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON r.applicant_id = a.id AND r.carrier_id = a.carrier_id")
    expect(sql).toContain("ON rd.id = r.referrer_driver_id AND rd.carrier_id = a.carrier_id")
    expect(sql).toContain("WHERE applicant_id = a.id AND carrier_id = a.carrier_id")
  })

  it("settlement/advance/escrow lists guard their driver joins", async () => {
    await listSettlements(CARRIER)
    expect(lastSql()).toContain("ON d.id = s.driver_id AND d.carrier_id = s.carrier_id")
    await listAdvances(CARRIER)
    expect(lastSql()).toContain("ON d.id = a.driver_id AND d.carrier_id = a.carrier_id")
    await escrowBalances(CARRIER)
    expect(lastSql()).toContain("ON d.id = e.driver_id AND d.carrier_id = e.carrier_id")
  })

  it("customer list guards load join and invoice/payment subquery", async () => {
    await listCustomers(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON l.customer_id = c.id AND l.carrier_id = c.carrier_id")
    expect(sql).toContain("ON p.invoice_id = i.id AND p.carrier_id = i.carrier_id")
    expect(sql).toContain("WHERE i.customer_id = c.id AND i.carrier_id = c.carrier_id")
  })

  it("task list guards the assignee users join", async () => {
    await listTasks(CARRIER)
    expect(lastSql()).toContain("ON u.id = t.assignee_user_id AND u.carrier_id = t.carrier_id")
  })

  it("facility notes guard the document join", async () => {
    await listFacilityNotes(CARRIER, "f1")
    expect(lastSql()).toContain("ON d.id = n.document_id AND d.carrier_id = n.carrier_id")
  })
})
