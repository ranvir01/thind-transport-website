/**
 * listPortalUsers, portalPacketDocuments, and createQuoteRequest in portal.ts
 * had zero direct coverage — portal-actions-validation.test.ts mocks `../portal`
 * wholesale, and page.tsx just calls portalPacketDocuments without exercising
 * its SQL. createQuoteRequest is the shipper-facing write path (dynamic-imports
 * ../loads and ../notify), so it deserves the same param/scoping pin the other
 * portal mutations already have.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { callAt, callMatching, type QueryFn, type QueryOneFn } from "./helpers/db-mock"

// Explicit signatures: `vi.fn(async () => [])` declares a ZERO-argument
// function, which types mock.calls[n] as the empty tuple and makes every
// `const [sql, params] = ...` below a type error. See helpers/db-mock.ts.
vi.mock("../db", () => ({
  query: vi.fn<QueryFn>(async () => []),
  queryOne: vi.fn<QueryOneFn>(async () => null),
}))
type CreateLoadFn = (
  carrierId: string,
  input: { stops: { appt_start: string | null }[] } & Record<string, unknown>,
  actor: { id: string | null; name: string }
) => Promise<{ id: string; reference: string }>
const createLoadMock = vi.fn<CreateLoadFn>(async () => ({ id: "load-1", reference: "THD-1001" }))
vi.mock("../loads", () => ({ createLoad: (...args: Parameters<CreateLoadFn>) => createLoadMock(...args) }))
type NotifyRolesFn = (
  carrierId: string,
  roles: string[],
  payload: Record<string, unknown>
) => Promise<void>
const notifyRolesMock = vi.fn<NotifyRolesFn>(async () => {})
vi.mock("../notify", () => ({ notifyRoles: (...args: Parameters<NotifyRolesFn>) => notifyRolesMock(...args) }))

import { query } from "../db"
import { createQuoteRequest, listPortalUsers, portalPacketDocuments } from "../portal"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const CUSTOMER = "22222222-2222-2222-2222-222222222222"

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([])
  createLoadMock.mockClear()
  createLoadMock.mockResolvedValue({ id: "load-1", reference: "THD-1001" } as never)
  notifyRolesMock.mockClear()
})

describe("listPortalUsers", () => {
  it("scopes by carrier AND customer, and only broker/shipper roles", async () => {
    await listPortalUsers(CARRIER, CUSTOMER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND customer_id = $2")
    expect(String(sql)).toContain("role IN ('broker','shipper')")
    expect(params).toEqual([CARRIER, CUSTOMER])
  })
})

describe("portalPacketDocuments", () => {
  it("scopes to the carrier's own carrier-level docs, one row per kind", async () => {
    await portalPacketDocuments(CARRIER)
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("DISTINCT ON (kind)")
    expect(String(sql)).toContain("entity_type = 'carrier' AND entity_id = $1")
    expect(String(sql)).toContain("kind IN ('insurance','w9','authority_letter')")
    expect(params).toEqual([CARRIER])
  })
})

describe("createQuoteRequest", () => {
  const input = {
    originCity: "Kent",
    originState: "WA",
    destCity: "Boise",
    destState: "ID",
    pickupDate: "2026-08-01",
    equipment: "dry_van" as const,
    weightLbs: 42000,
    commodity: "General freight",
    requestedByName: "Jamie Shipper",
  }

  it("creates a quoted load scoped to the requesting customer, with $0 rates and both stops", async () => {
    await createQuoteRequest(CARRIER, CUSTOMER, input)

    expect(createLoadMock).toHaveBeenCalledTimes(1)
    const [carrierArg, loadInput, actor] = createLoadMock.mock.calls[0]!
    expect(carrierArg).toBe(CARRIER)
    expect(loadInput).toMatchObject({
      customer_id: CUSTOMER,
      status: "quoted",
      equipment: "dry_van",
      weight_lbs: 42000,
      linehaul_cents: 0,
      fuel_surcharge_cents: 0,
      source: "quote",
    })
    expect(loadInput.stops).toEqual([
      { type: "pickup", city: "Kent", state: "WA", appt_start: "2026-08-01T08:00:00" },
      { type: "delivery", city: "Boise", state: "ID" },
    ])
    expect(actor).toEqual({ id: null, name: "Jamie Shipper" })
  })

  it("leaves the pickup appointment unset when no pickup date is given", async () => {
    await createQuoteRequest(CARRIER, CUSTOMER, { ...input, pickupDate: null })
    const [, loadInput] = createLoadMock.mock.calls[0]!
    expect(loadInput.stops[0].appt_start).toBeNull()
  })

  it("logs a CRM activity against the new load", async () => {
    await createQuoteRequest(CARRIER, CUSTOMER, input)
    const { sql, params } = callMatching(queryMock, "INSERT INTO hub.crm_activities")
    expect(sql).toContain("INSERT INTO hub.crm_activities")
    expect(params[0]).toBe(CARRIER)
    expect(params[1]).toBe(CUSTOMER)
    expect(params[2]).toBe("load-1")
    expect(String(params[3])).toContain("Kent, WA → Boise, ID")
  })

  it("notifies owner and dispatcher roles with a link to the new load", async () => {
    await createQuoteRequest(CARRIER, CUSTOMER, input)
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
    const [carrierArg, roles, payload] = notifyRolesMock.mock.calls[0]!
    expect(carrierArg).toBe(CARRIER)
    expect(roles).toEqual(["owner", "dispatcher"])
    expect(payload).toMatchObject({ kind: "quote", link: "/hub/loads/load-1" })
  })

  it("returns the new load's reference", async () => {
    const result = await createQuoteRequest(CARRIER, CUSTOMER, input)
    expect(result).toEqual({ reference: "THD-1001" })
  })
})
