/**
 * Driver app invites (M11): stateless HMAC tokens and the accept flow.
 * Pins signature verification (tamper/expiry/secret handling) and the
 * account-creation guards — driver still on roster, one account per driver,
 * one account per email — all carrier-scoped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async () => "hashed-pw") } }))

import { query, queryOne } from "@/lib/hub/db"
import {
  acceptDriverInvite, createDriverInviteToken, getDriverInviteState, hasDriverAppAccount,
  sendDriverInviteEmail, verifyDriverInviteToken,
} from "@/lib/hub/driver-invite"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const PAYLOAD = { carrierId: "carrier-1", driverId: "driver-1", email: "amar@example.com" }

const ORIGINAL = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_APP_HOST: process.env.NEXT_PUBLIC_APP_HOST,
}

beforeEach(() => {
  vi.clearAllMocks()
  queryMock.mockResolvedValue([])
  queryOneMock.mockResolvedValue(null)
  process.env.NEXTAUTH_SECRET = "test-secret"
  delete process.env.AUTH_SECRET
  delete process.env.NEXT_PUBLIC_APP_HOST
  process.env.NEXTAUTH_URL = "https://thindtransport.com"
})

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("driver invite tokens", () => {
  it("round-trips carrier, driver, and lowercased email", () => {
    const token = createDriverInviteToken({ ...PAYLOAD, email: "Amar@Example.com" })
    expect(token).toBeTruthy()
    expect(verifyDriverInviteToken(token!)).toEqual(PAYLOAD)
  })

  it("rejects a tampered payload", () => {
    const token = createDriverInviteToken(PAYLOAD)!
    const [, sig] = token.split(".")
    const forged = Buffer.from(
      JSON.stringify({ c: "carrier-2", d: "driver-1", e: "amar@example.com", x: 9999999999 })
    ).toString("base64url")
    expect(verifyDriverInviteToken(`${forged}.${sig}`)).toBeNull()
    expect(verifyDriverInviteToken("garbage")).toBeNull()
    expect(verifyDriverInviteToken("")).toBeNull()
  })

  it("expires after its TTL", () => {
    const token = createDriverInviteToken(PAYLOAD)!
    const eightDaysOn = Date.now() + 8 * 86400 * 1000
    expect(verifyDriverInviteToken(token, eightDaysOn)).toBeNull()
    expect(verifyDriverInviteToken(token)).not.toBeNull()
  })

  it("refuses to mint or verify without an auth secret or a real email", () => {
    expect(createDriverInviteToken({ ...PAYLOAD, email: "not-an-email" })).toBeNull()
    const token = createDriverInviteToken(PAYLOAD)!
    delete process.env.NEXTAUTH_SECRET
    expect(createDriverInviteToken(PAYLOAD)).toBeNull()
    expect(verifyDriverInviteToken(token)).toBeNull()
  })
})

describe("acceptDriverInvite", () => {
  const driverRow = { first_name: "Amar", last_name: "Gill" }

  it("creates the linked driver-role account", async () => {
    queryOneMock
      .mockResolvedValueOnce(driverRow as never) // roster lookup
      .mockResolvedValueOnce(null) // driver not yet claimed
      .mockResolvedValueOnce(null) // email free
    const token = createDriverInviteToken(PAYLOAD)!
    const result = await acceptDriverInvite(token, { password: "password123" })
    expect(result).toEqual({ ok: true, email: "amar@example.com" })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO hub.users"),
      ["carrier-1", "amar@example.com", "hashed-pw", "Amar Gill", "driver-1"]
    )
    // Roster lookup is carrier-scoped — a token can never claim across tenants.
    expect(queryOneMock.mock.calls[0][1]).toEqual(["carrier-1", "driver-1"])
  })

  it("rejects bad tokens and drivers no longer on the roster", async () => {
    const bad = await acceptDriverInvite("nope", { password: "password123" })
    expect(bad.ok).toBe(false)
    const token = createDriverInviteToken(PAYLOAD)!
    const gone = await acceptDriverInvite(token, { password: "password123" })
    expect(gone).toMatchObject({ ok: false, error: expect.stringContaining("no longer on the roster") })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("is single-use per driver and per email", async () => {
    queryOneMock
      .mockResolvedValueOnce(driverRow as never)
      .mockResolvedValueOnce({ id: "u1" } as never) // driver already claimed
    const token = createDriverInviteToken(PAYLOAD)!
    const claimed = await acceptDriverInvite(token, { password: "password123" })
    expect(claimed).toMatchObject({ ok: false, error: expect.stringContaining("already has app access") })

    queryOneMock
      .mockResolvedValueOnce(driverRow as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u2" } as never) // email taken
    const taken = await acceptDriverInvite(token, { password: "password123" })
    expect(taken).toMatchObject({ ok: false, error: expect.stringContaining("already exists") })
    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe("getDriverInviteState", () => {
  it("reports claimed state for the accept page", async () => {
    queryOneMock
      .mockResolvedValueOnce({ first_name: "Amar", last_name: "Gill" } as never)
      .mockResolvedValueOnce({ name: "Demo Carrier" } as never)
      .mockResolvedValueOnce(null) // not claimed
    const token = createDriverInviteToken(PAYLOAD)!
    expect(await getDriverInviteState(token)).toEqual({
      valid: true, claimed: false, driverName: "Amar Gill",
      carrierName: "Demo Carrier", email: "amar@example.com",
    })
    expect(await getDriverInviteState("garbage")).toEqual({ valid: false, claimed: false })
  })
})

describe("hasDriverAppAccount", () => {
  it("is carrier-scoped and reflects whether a linked hub.users row exists", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "u1" } as never)
    expect(await hasDriverAppAccount("carrier-1", "driver-1")).toBe(true)
    expect(queryOneMock).toHaveBeenCalledWith(expect.stringContaining("hub.users"), ["carrier-1", "driver-1"])

    queryOneMock.mockResolvedValueOnce(null)
    expect(await hasDriverAppAccount("carrier-1", "driver-1")).toBe(false)
  })
})

describe("sendDriverInviteEmail", () => {
  const recipient = { driverId: "driver-1", email: "amar@example.com", firstName: "Amar" }
  const mailFrom = (name?: string) => `"${name}" <noreply@test>`

  it("signs a token and sends the invite over the caller's transport", async () => {
    const sendMail = vi.fn(async () => undefined)
    const ok = await sendDriverInviteEmail({ sendMail }, mailFrom, "carrier-1", "Demo Carrier", recipient)
    expect(ok).toBe(true)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Demo Carrier" <noreply@test>',
        to: "amar@example.com",
        text: expect.stringMatching(/https:\/\/thindtransport\.com\/hub\/driver-invite\/[\w-]+\.[\w-]+/),
      })
    )
  })

  it("prefers NEXT_PUBLIC_APP_HOST for the emailed link once the app origin is configured", async () => {
    process.env.NEXT_PUBLIC_APP_HOST = "app.loadoff.com"
    const sendMail = vi.fn(async () => undefined)
    const ok = await sendDriverInviteEmail({ sendMail }, mailFrom, "carrier-1", "Demo Carrier", recipient)
    expect(ok).toBe(true)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/https:\/\/app\.loadoff\.com\/hub\/driver-invite\/[\w-]+\.[\w-]+/),
      })
    )
  })

  it("never calls the transport when no auth secret can sign a token", async () => {
    delete process.env.NEXTAUTH_SECRET
    const sendMail = vi.fn(async () => undefined)
    const ok = await sendDriverInviteEmail({ sendMail }, mailFrom, "carrier-1", "Demo Carrier", recipient)
    expect(ok).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("reports failure without throwing when the SMTP send rejects", async () => {
    const sendMail = vi.fn(async () => { throw new Error("connect ETIMEDOUT") })
    const ok = await sendDriverInviteEmail({ sendMail }, mailFrom, "carrier-1", "Demo Carrier", recipient)
    expect(ok).toBe(false)
  })
})
