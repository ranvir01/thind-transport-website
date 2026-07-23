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

// Digest early-returns without an office email; stub settings so its stats SQL runs.
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ name: "Test Carrier" })),
  getCarrierSettings: vi.fn(async () => ({ notifications: { officeEmail: "office@example.com" } })),
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
import { listInvoices } from "../invoices"
import { listTasks, runTaskAutomations } from "../tasks"
import { listFacilityNotes } from "../facilities"
import { driverActiveLoads, driverDocuments, openDocumentRequests } from "../driver-app"
import { portalLoads, portalLoadDocuments, portalInvoices } from "../portal"
import { todayData } from "../today"
import { listTimeOff } from "../timeoff"
import { listDvirsForTruck, truckDvirState } from "../dvir"
import { getTrackedLoad } from "../sharelinks"
import { exportIftaSources } from "../ifta"
import { complianceEntries } from "../compliance"
import { truckPnlRange } from "../reports"
import { truckPnl, exportCsv } from "../expenses"
import { sendOwnerDigest } from "../digest"

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

/** Every SQL statement issued since the last reset, joined — for multi-query functions. */
function allSql(): string {
  const calls = [...queryMock.mock.calls, ...queryOneMock.mock.calls]
  queryMock.mockClear()
  queryOneMock.mockClear()
  return calls.map((c) => String(c[0])).join("\n")
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

  it("task automations guard the unbilled-invoice existence check", async () => {
    await runTaskAutomations(CARRIER)
    expect(allSql()).toContain(
      "FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id"
    )
  })

  it("facility notes guard the document join", async () => {
    await listFacilityNotes(CARRIER, "f1")
    expect(lastSql()).toContain("ON d.id = n.document_id AND d.carrier_id = n.carrier_id")
  })

  it("driver active loads guard customer/truck/trailer joins and doc-kinds lateral", async () => {
    await driverActiveLoads(CARRIER, "d1")
    const sql = lastSql()
    expect(sql).toContain("ON c.id = l.customer_id AND c.carrier_id = l.carrier_id")
    expect(sql).toContain("ON t.id = l.truck_id AND t.carrier_id = l.carrier_id")
    expect(sql).toContain("ON tr.id = l.trailer_id AND tr.carrier_id = l.carrier_id")
    expect(sql).toContain("d.entity_type = 'load' AND d.entity_id = l.id AND d.carrier_id = l.carrier_id")
  })

  it("driver documents are carrier-scoped, not entity-id-only", async () => {
    await driverDocuments(CARRIER, "d1")
    const sql = lastSql()
    expect(sql).toContain("carrier_id = $1 AND entity_type = 'driver' AND entity_id = $2")
  })

  it("driver open document requests guard the load-reference join", async () => {
    await openDocumentRequests(CARRIER, "d1")
    expect(lastSql()).toContain("ON l.id = r.load_id AND l.carrier_id = r.carrier_id")
  })

  it("portal load list guards its stop laterals", async () => {
    await portalLoads(CARRIER, "c1")
    const sql = lastSql()
    expect(sql).toContain("WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup'")
    expect(sql).toContain("WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery'")
  })

  it("portal invoices guard the load-reference join (money-audit flag)", async () => {
    await portalInvoices(CARRIER, "c1")
    expect(lastSql()).toContain("JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id")
  })

  it("portal load documents guard the document side of the loads join", async () => {
    await portalLoadDocuments(CARRIER, "c1", "l1")
    expect(lastSql()).toContain("ON l.id = d.entity_id AND d.entity_type = 'load' AND d.carrier_id = l.carrier_id")
  })

  it("invoice list (shared INVOICE_SELECT) guards customer/load joins", async () => {
    await listInvoices(CARRIER)
    const sql = lastSql()
    expect(sql).toContain("ON c.id = i.customer_id AND c.carrier_id = i.carrier_id")
    expect(sql).toContain("ON l.id = i.load_id AND l.carrier_id = i.carrier_id")
  })

  it("Today widget guards every load/driver/truck/user/customer join and lateral", async () => {
    await todayData(CARRIER)
    const sql = allSql()
    // stops-today: stops→loads→drivers/trucks chain
    expect(sql).toContain("JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = s.carrier_id")
    expect(sql).toContain("LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = l.carrier_id")
    expect(sql).toContain("LEFT JOIN hub.trucks t ON t.id = l.truck_id AND t.carrier_id = l.carrier_id")
    // empty-truck panels: seated-driver join + truck-scoped load laterals
    expect(sql).toContain("ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id")
    expect(sql).toContain("WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND s.type = 'delivery'")
    expect(sql).toContain("WHERE l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL")
    // empty-soon: the "no upcoming pickup" NOT EXISTS must guard both the
    // outer loads row and its nested next-pickup stops lateral by carrier_id,
    // not just truck_id (truck_id/load_id are UUIDs so this was never a live
    // leak, but it's the same both-sides-of-the-join doctrine as everywhere else).
    expect(sql).toContain("WHERE nl.truck_id = t.id AND nl.carrier_id = t.carrier_id AND nl.deleted_at IS NULL")
    expect(sql).toContain("WHERE load_id = nl.id AND carrier_id = nl.carrier_id AND type = 'pickup'")
    // tasks-due assignee join
    expect(sql).toContain("ON u.id = t.assignee_user_id AND u.carrier_id = t.carrier_id")
    // unbilled: customer join + invoice existence check
    expect(sql).toContain("ON c.id = l.customer_id AND c.carrier_id = l.carrier_id")
    expect(sql).toContain("FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id")
  })

  it("time-off reads guard the driver join", async () => {
    await listTimeOff(CARRIER)
    expect(lastSql()).toContain("JOIN hub.drivers d ON d.id = r.driver_id AND d.carrier_id = r.carrier_id")
  })

  it("DVIR reads guard truck/driver joins and the prior-dvir subquery", async () => {
    await listDvirsForTruck(CARRIER, "t1")
    const listSql = lastSql()
    expect(listSql).toContain("JOIN hub.trucks t ON t.id = v.truck_id AND t.carrier_id = v.carrier_id")
    expect(listSql).toContain("JOIN hub.drivers d ON d.id = v.driver_id AND d.carrier_id = v.carrier_id")
    await truckDvirState(CARRIER, "t1")
    expect(lastSql()).toContain("WHERE r.prior_dvir_id = v.id AND r.carrier_id = v.carrier_id")
  })

  it("public tracked-load lookup scopes stops and pings to the link's carrier", async () => {
    queryOneMock
      .mockResolvedValueOnce({ load_id: "l1", carrier_id: CARRIER })
      .mockResolvedValueOnce({
        id: "l1", reference: "R1", status: "in_transit", equipment: "dry_van",
        truck_id: "t1", carrier_name: "Carrier",
      })
      .mockResolvedValueOnce(null)
    await getTrackedLoad("token")
    const sql = allSql()
    expect(sql).toContain("FROM hub.stops WHERE load_id = $1 AND carrier_id = $2")
    expect(sql).toContain("FROM hub.position_pings WHERE truck_id = $1 AND carrier_id = $2")
    // Unauthenticated surface: stops are the explicit public-safe column list,
    // never SELECT * (facility/address, pickup/PO refs, notes, raw lat/lng).
    expect(sql).not.toContain("SELECT * FROM hub.stops")
    expect(sql).toContain("SELECT id, sequence, type, city, state, fcfs, appt_start, appt_end, arrived_at, departed_at")
  })

  it("IFTA source export guards both truck joins", async () => {
    await exportIftaSources(CARRIER, "2026Q1")
    const sql = allSql()
    expect(sql).toContain("JOIN hub.trucks t ON t.id = p.truck_id AND t.carrier_id = p.carrier_id")
    expect(sql).toContain("LEFT JOIN hub.trucks t ON t.id = f.truck_id AND t.carrier_id = f.carrier_id")
  })

  it("compliance wall guards the maintenance-schedule truck join", async () => {
    await complianceEntries(CARRIER)
    expect(allSql()).toContain("JOIN hub.trucks t ON t.id = ms.truck_id AND t.carrier_id = ms.carrier_id")
  })

  it("truck P&L subqueries carry the carrier guard (both variants)", async () => {
    await truckPnl(CARRIER)
    const pnlSql = lastSql()
    await truckPnlRange(CARRIER, { from: "2026-01-01", to: "2026-03-31" })
    const rangeSql = lastSql()
    for (const sql of [pnlSql, rangeSql]) {
      expect(sql).toContain("l.truck_id = t.id AND l.carrier_id = t.carrier_id")
      expect(sql).toContain("f.truck_id = t.id AND f.carrier_id = t.carrier_id")
      expect(sql).toContain("m.truck_id = t.id AND m.carrier_id = t.carrier_id")
      expect(sql).toContain("e.truck_id = t.id AND e.carrier_id = t.carrier_id")
    }
  })

  it("invoices CSV export guards its customer and load joins", async () => {
    await exportCsv(CARRIER, "invoices")
    const sql = lastSql()
    expect(sql).toContain("JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id")
    expect(sql).toContain("JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id")
  })

  it("owner digest guards the empty-trucks load subquery and the unbilled invoice check", async () => {
    await sendOwnerDigest(CARRIER)
    const sql = allSql()
    expect(sql).toContain("l.truck_id = t.id AND l.carrier_id = t.carrier_id AND l.deleted_at IS NULL")
    expect(sql).toContain("FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id")
  })
})
