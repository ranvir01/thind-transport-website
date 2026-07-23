/**
 * Regression (1c tenancy audit, tasks subsystem):
 * 1. createTask wrote `assigneeUserId` straight onto hub.tasks with no
 *    tenancy check — every other cross-table write guards both sides via
 *    assertCarrierRefs (see assignFuelToLoad); assignee_user_id was the one
 *    write-side reference in this subsystem missing it.
 * 2. runTaskAutomations' "unbilled load" sweep NOT EXISTS'd hub.invoices by
 *    load_id only, the same shape already fixed in today.ts/digest.ts but
 *    never carried over here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { query, queryOne } from "../db"
import { assertCarrierRefs } from "../tenancy"
import { createTask, runTaskAutomations } from "../tasks"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const assertRefsMock = vi.mocked(assertCarrierRefs)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockClear()
  assertRefsMock.mockClear()
})

describe("createTask — assignee tenancy guard", () => {
  it("validates assigneeUserId belongs to the caller's carrier before inserting", async () => {
    await createTask(CARRIER, { title: "Call broker", assigneeUserId: "foreign-user" }, null)
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { assignee_user_id: "foreign-user" })
    expect(assertRefsMock.mock.invocationCallOrder[0]).toBeLessThan(queryMock.mock.invocationCallOrder[0])
  })

  it("rejects the insert when the assignee doesn't belong to the caller's carrier", async () => {
    assertRefsMock.mockRejectedValueOnce(new Error("User not found"))
    await expect(
      createTask(CARRIER, { title: "Call broker", assigneeUserId: "foreign-user" }, null)
    ).rejects.toThrow("User not found")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("skips the check when no assignee is set", async () => {
    await createTask(CARRIER, { title: "Call broker" }, null)
    expect(assertRefsMock).toHaveBeenCalledWith(CARRIER, { assignee_user_id: undefined })
    expect(queryMock).toHaveBeenCalled()
  })
})

describe("runTaskAutomations — unbilled-load sweep", () => {
  it("guards the invoice-existence check by carrier_id, not load_id alone", async () => {
    await runTaskAutomations(CARRIER)
    const sql = queryMock.mock.calls.map((c) => String(c[0])).join("\n")
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id AND i.carrier_id = l.carrier_id)")
  })
})
