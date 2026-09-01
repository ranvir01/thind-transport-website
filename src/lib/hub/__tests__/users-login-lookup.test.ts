/**
 * Login lookup must succeed from hub.users alone. The two-company switcher
 * join used to ride the same query; when that table or column was missing
 * the error was swallowed and every hub e2e smoke died on CredentialsSignin.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db-available", () => ({
  hubDbAvailable: vi.fn(() => true),
}))
vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "../db"
import { hubDbAvailable } from "../db-available"
import { findHubUserByEmail } from "../users"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const availableMock = vi.mocked(hubDbAvailable)

const ROW = {
  id: "user-1",
  email: "dispatch@demo.thind",
  password_hash: "$2b$10$hash",
  name: "Demo Dispatch",
  role: "dispatcher" as const,
  carrier_id: "11111111-1111-1111-1111-111111111111",
  phone: null,
  customer_id: null,
  driver_id: null,
  active: true,
  data_mode: "production" as const,
}

describe("findHubUserByEmail", () => {
  beforeEach(() => {
    availableMock.mockReset().mockReturnValue(true)
    queryMock.mockReset().mockResolvedValue([])
    queryOneMock.mockReset()
  })

  it("returns the user from a single-table hub.users read", async () => {
    queryOneMock.mockResolvedValueOnce(ROW)
    queryMock.mockResolvedValueOnce([])

    const found = await findHubUserByEmail("Dispatch@Demo.Thind")
    expect(found?.email).toBe("dispatch@demo.thind")
    expect(found?.password_hash).toBe("$2b$10$hash")
    expect(found?.allowed_carrier_ids).toEqual([ROW.carrier_id])
    expect(String(queryOneMock.mock.calls[0][0])).toContain("FROM hub.users")
    expect(String(queryOneMock.mock.calls[0][0])).not.toContain("user_carrier_access")
  })

  it("still signs in when the switcher table query throws", async () => {
    queryOneMock.mockResolvedValueOnce({ ...ROW, data_mode: "sandbox" })
    queryMock.mockRejectedValueOnce(new Error('relation "hub.user_carrier_access" does not exist'))

    const found = await findHubUserByEmail("dispatch@demo.thind")
    expect(found?.id).toBe("user-1")
    expect(found?.data_mode).toBe("sandbox")
    expect(found?.allowed_carrier_ids).toEqual([ROW.carrier_id])
  })

  it("uses switcher rows when the access table is present", async () => {
    queryOneMock.mockResolvedValueOnce(ROW)
    queryMock.mockResolvedValueOnce([
      { carrier_id: ROW.carrier_id },
      { carrier_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    ])

    const found = await findHubUserByEmail("dispatch@demo.thind")
    expect(found?.allowed_carrier_ids).toEqual([
      ROW.carrier_id,
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    ])
  })

  it("returns null without querying when the hub database is not configured", async () => {
    availableMock.mockReturnValue(false)
    expect(await findHubUserByEmail("dispatch@demo.thind")).toBeNull()
    expect(queryOneMock).not.toHaveBeenCalled()
  })
})
