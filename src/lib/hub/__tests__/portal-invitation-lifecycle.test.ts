/**
 * Portal invitations (M9): the account-creation path for external broker/
 * shipper logins had zero direct coverage — portal-actions-validation.test.ts
 * mocks `../portal` wholesale, and portal-isolation.test.ts never calls
 * acceptInvitation at all. This is the same class of flow driver-invite.test.ts
 * already pins for the driver app (single-use token, no-longer-eligible,
 * email-already-exists), just for the DB-stored invitation token instead of
 * a signed one — same account-creation guards deserve the same coverage.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async () => "hashed-pw") } }))

import { query, queryOne } from "../db"
import { acceptInvitation, createPortalInvitation, getInvitation } from "../portal"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const CUSTOMER = "22222222-2222-2222-2222-222222222222"

const invitationRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "inv-1",
  carrier_id: CARRIER,
  customer_id: CUSTOMER,
  email: "broker@example.com",
  role: "broker" as const,
  accepted_user_id: null,
  expires_at: "2099-01-01T00:00:00.000Z",
  customer_name: "Acme Freight",
  ...overrides,
})

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
})

describe("createPortalInvitation", () => {
  it("lowercases the email and mints a 7-day token", async () => {
    // createPortalInvitation now assertCarrierRefs the customer_id at the data
    // layer (1c audit: an invitation must not be able to bind a foreign
    // customer even if the caller checked). Answer that ownership lookup so
    // this test exercises the insert, not the guard — the guard's own refusal
    // path is covered below.
    queryMock.mockResolvedValueOnce([{ id: CUSTOMER }])
    await createPortalInvitation(CARRIER, CUSTOMER, "Broker@Example.com", "broker", "Dana")
    const [sql, params] = queryMock.mock.calls[1]
    expect(String(sql)).toContain("INSERT INTO hub.portal_invitations")
    expect(String(sql)).toContain("NOW() + INTERVAL '7 days'")
    expect(params[0]).toBe(CARRIER)
    expect(params[1]).toBe(CUSTOMER)
    expect(params[2]).toBe("broker@example.com")
    expect(params[3]).toBe("broker")
    expect(typeof params[4]).toBe("string")
    expect((params[4] as string).length).toBe(48) // 24 bytes hex-encoded
  })

  it("refuses to bind a customer that belongs to another carrier", async () => {
    // Ownership lookup comes back empty → the invitation must never be written.
    queryMock.mockResolvedValueOnce([])
    await expect(
      createPortalInvitation(CARRIER, "33333333-3333-3333-3333-333333333333", "b@example.com", "broker", "Dana")
    ).rejects.toThrow(/not found/i)
    const inserted = queryMock.mock.calls.some(([sql]) =>
      String(sql).includes("INSERT INTO hub.portal_invitations")
    )
    expect(inserted).toBe(false)
  })
})

describe("getInvitation", () => {
  it("joins the customer name and scopes the lookup by token alone", async () => {
    queryOneMock.mockResolvedValueOnce(invitationRow())
    const result = await getInvitation("tok-123")
    expect(result?.customer_name).toBe("Acme Freight")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE i.token = $1")
    expect(params).toEqual(["tok-123"])
  })
})

describe("acceptInvitation", () => {
  it("refuses an unknown token without touching the users table", async () => {
    queryOneMock.mockResolvedValueOnce(null) // getInvitation
    const result = await acceptInvitation("nope", { name: "Sam", password: "password123" })
    expect(result).toEqual({ ok: false, error: "Invitation not found" })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("refuses an already-accepted invitation", async () => {
    queryOneMock.mockResolvedValueOnce(invitationRow({ accepted_user_id: "u-existing" }))
    const result = await acceptInvitation("tok", { name: "Sam", password: "password123" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already used/i)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("refuses an expired invitation", async () => {
    queryOneMock.mockResolvedValueOnce(invitationRow({ expires_at: "2000-01-01T00:00:00.000Z" }))
    const result = await acceptInvitation("tok", { name: "Sam", password: "password123" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/expired/i)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("refuses when an account with the invitation's email already exists", async () => {
    queryOneMock
      .mockResolvedValueOnce(invitationRow()) // getInvitation
      .mockResolvedValueOnce({ id: "u-other" }) // existing email lookup
    const result = await acceptInvitation("tok", { name: "Sam", password: "password123" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already exists/i)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("creates the scoped account, links the invitation, and returns the email", async () => {
    queryOneMock
      .mockResolvedValueOnce(invitationRow()) // getInvitation
      .mockResolvedValueOnce(null) // email free
    queryMock.mockResolvedValueOnce([{ id: "u-new" }]) // INSERT ... RETURNING id

    const result = await acceptInvitation("tok", { name: "  Sam Broker  ", password: "password123" })

    expect(result).toEqual({ ok: true, email: "broker@example.com" })
    const [insertSql, insertParams] = queryMock.mock.calls[0]
    expect(String(insertSql)).toContain("INSERT INTO hub.users")
    expect(insertParams).toEqual([CARRIER, "broker@example.com", "hashed-pw", "Sam Broker", "broker", CUSTOMER])

    const [linkSql, linkParams] = queryMock.mock.calls[1]
    expect(String(linkSql)).toContain("UPDATE hub.portal_invitations SET accepted_user_id = $1")
    // The link write carries its own carrier scope, so an invitation is never
    // addressable by id alone (cross-tenant harness).
    expect(String(linkSql)).toContain("WHERE id = $2 AND carrier_id = $3")
    expect(linkParams).toEqual(["u-new", "inv-1", CARRIER])
  })
})
