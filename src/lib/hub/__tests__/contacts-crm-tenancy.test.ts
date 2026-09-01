/**
 * SQL-shape tests pinning the tenancy guards on the contacts/CRM path
 * (AGENTS.md: cross-table writes guard tenancy on BOTH sides, reads are
 * carrier-scoped). Regression for the hole where addContactAction /
 * addCrmNoteAction accepted a foreign customer_id and listContacts /
 * the CRM feed rendered the injected rows on the victim carrier's page.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { query } from "../db"
import { addCrmActivity, createContact, listContacts, listCrmActivities } from "../customers"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const CUSTOMER = "22222222-2222-2222-2222-222222222222"

function lastCall(): { sql: string; params: unknown[] } {
  const call = queryMock.mock.calls[queryMock.mock.calls.length - 1]
  queryMock.mockClear()
  return { sql: String(call[0]), params: call[1] as unknown[] }
}

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
})

describe("contacts + CRM activities are carrier-guarded on both sides", () => {
  it("listContacts filters by carrier_id, not customer_id alone", async () => {
    await listContacts(CARRIER, CUSTOMER)
    const { sql, params } = lastCall()
    expect(sql).toContain("carrier_id = $1 AND customer_id = $2")
    expect(params).toEqual([CARRIER, CUSTOMER])
  })

  it("listCrmActivities filters by carrier_id, not customer_id alone", async () => {
    await listCrmActivities(CARRIER, CUSTOMER)
    const { sql, params } = lastCall()
    expect(sql).toContain("carrier_id = $1 AND customer_id = $2")
    expect(params).toEqual([CARRIER, CUSTOMER])
  })

  it("createContact inserts through a customer-ownership join (assignFuelToLoad pattern)", async () => {
    queryMock.mockResolvedValue([{ id: "contact-1" }])
    const contact = await createContact(CARRIER, { customer_id: CUSTOMER, name: "Dana" })
    expect(contact).toEqual({ id: "contact-1" })
    const { sql, params } = lastCall()
    expect(sql).toContain("SELECT c.carrier_id, c.id")
    expect(sql).toContain("FROM hub.customers c")
    expect(sql).toContain("WHERE c.carrier_id = $1 AND c.id = $2 AND c.deleted_at IS NULL")
    expect(params.slice(0, 2)).toEqual([CARRIER, CUSTOMER])
  })

  it("createContact returns null for a foreign or deleted customer (no row inserted)", async () => {
    const contact = await createContact(CARRIER, { customer_id: CUSTOMER, name: "Dana" })
    expect(contact).toBeNull()
  })

  it("addCrmActivity inserts through the same customer-ownership join", async () => {
    queryMock.mockResolvedValue([{ id: "activity-1" }])
    const inserted = await addCrmActivity(CARRIER, {
      customer_id: CUSTOMER, kind: "note", body: "Called about detention", actor_id: "u1", actor_name: "Priya",
    })
    expect(inserted).toBe(true)
    const { sql, params } = lastCall()
    expect(sql).toContain("SELECT c.carrier_id, c.id")
    expect(sql).toContain("FROM hub.customers c")
    expect(sql).toContain("WHERE c.carrier_id = $1 AND c.id = $2 AND c.deleted_at IS NULL")
    expect(params.slice(0, 2)).toEqual([CARRIER, CUSTOMER])
  })

  it("addCrmActivity reports false for a foreign customer so the action can refuse", async () => {
    const inserted = await addCrmActivity(CARRIER, {
      customer_id: CUSTOMER, kind: "note", body: "x", actor_id: null, actor_name: "Priya",
    })
    expect(inserted).toBe(false)
  })
})
