/**
 * Broker status updates. Every refusal is a rule with a reason behind it:
 * opt-in (an AR inbox is the wrong place for tracking mail), never the
 * sandbox (the sim transitions loads all day), never a reserved domain (the
 * demo tenant), once per (load, stage), silent without SMTP, never on cancel.
 * And the one structural rule: a failure here can never undo a status change
 * — that is pinned in loads-dispatch-notify.test.ts, where the hook lives.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

interface Mail { from: string; to: string; subject: string; text: string }

const { sendMail, isEmailConfigured, notifyRoles, loadEta, createShareLink } = vi.hoisted(() => ({
  sendMail: vi.fn(async (_mail: Mail) => ({ messageId: "m1" })),
  isEmailConfigured: vi.fn(() => true),
  notifyRoles: vi.fn(async () => undefined),
  loadEta: vi.fn(async () => null),
  createShareLink: vi.fn(async () => ({ token: "minted-token" })),
}))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../../mailer", () => ({
  isEmailConfigured,
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn((name: string) => `"${name}" <noreply@example.test>`),
}))
vi.mock("../sandbox", () => ({
  isSandboxCarrier: vi.fn((id: string) => id === "33333333-3333-3333-3333-333333333333"),
}))
vi.mock("../sharelinks", () => ({ createShareLink }))
vi.mock("../eta-load", () => ({ loadEta }))
vi.mock("../notify", () => ({ notifyRoles }))

import { query, queryOne } from "../db"
import { isReservedAddress, publicOrigin, sendBrokerUpdate, updateLine } from "../broker-updates"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const SANDBOX = "33333333-3333-3333-3333-333333333333"
const LOAD = "44444444-4444-4444-4444-444444444444"

const STOPS = [
  { type: "pickup", city: "Kent", state: "WA" },
  { type: "delivery", city: "Fresno", state: "CA" },
]

function loadRow(over: Record<string, unknown> = {}) {
  return {
    reference: "THD-1042", customer_reference: "PCL-99120", status: "in_transit",
    customer_name: "Pacific Crest Logistics", status_updates_email: "track@pacificcrest.com",
    carrier_name: "Thind Transport", ...over,
  }
}

/** Routes queryOne by the SQL it is handed; unmatched SQL resolves null. */
function routeQueryOne(handlers: { load?: unknown; already?: unknown; link?: unknown }) {
  queryOneMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.loads l")) return (handlers.load ?? null) as never
    if (s.includes("FROM hub.load_events")) return (handlers.already ?? null) as never
    if (s.includes("FROM hub.share_links")) return (handlers.link ?? null) as never
    return null
  })
}

function insertedEvent() {
  const call = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO hub.load_events"))
  return call ? JSON.parse(String((call[1] as unknown[])[2])) : null
}

describe("sendBrokerUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isEmailConfigured.mockReturnValue(true)
    loadEta.mockResolvedValue(null)
    routeQueryOne({ load: loadRow(), link: { token: "live-token" } })
    queryMock.mockImplementation(async (sql: string) =>
      (String(sql).includes("FROM hub.stops") ? STOPS : []) as never
    )
    delete process.env.NEXT_PUBLIC_APP_HOST
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it("never sends from the sandbox, before touching the database", async () => {
    const r = await sendBrokerUpdate(SANDBOX, LOAD, "in_transit")
    expect(r).toEqual({ sent: false, reason: "sandbox" })
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("is opt-in: a customer with no status-updates address gets nothing, billing_email or not", async () => {
    routeQueryOne({ load: loadRow({ status_updates_email: null }) })
    expect(await sendBrokerUpdate(CARRIER, LOAD, "in_transit")).toEqual({ sent: false, reason: "opted_out" })
    routeQueryOne({ load: loadRow({ status_updates_email: "   " }) })
    expect(await sendBrokerUpdate(CARRIER, LOAD, "in_transit")).toEqual({ sent: false, reason: "opted_out" })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("refuses reserved domains, which is every broker in the demo tenant", async () => {
    routeQueryOne({ load: loadRow({ status_updates_email: "ops@midvalleybrokerage.example" }) })
    expect(await sendBrokerUpdate(CARRIER, LOAD, "delivered")).toEqual({ sent: false, reason: "reserved_domain" })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("never tells a broker about a cancelled load", async () => {
    routeQueryOne({ load: loadRow({ status: "cancelled" }) })
    expect(await sendBrokerUpdate(CARRIER, LOAD, "delivered")).toEqual({ sent: false, reason: "cancelled" })
  })

  it("sends once per (load, stage) — a second call is a no-op", async () => {
    routeQueryOne({ load: loadRow(), already: { id: 7 } })
    expect(await sendBrokerUpdate(CARRIER, LOAD, "at_pickup")).toEqual({ sent: false, reason: "already_sent" })
    expect(sendMail).not.toHaveBeenCalled()
    const dedupe = queryOneMock.mock.calls.find(([sql]) => String(sql).includes("FROM hub.load_events"))!
    expect(String(dedupe[0]).replace(/\s+/g, " ")).toContain("payload->>'type' = 'broker_update' AND payload->>'stage' = $3")
    expect(dedupe[1]).toEqual([CARRIER, LOAD, "at_pickup"])
  })

  it("is silent when SMTP is unset: no send, no event, a reason in the return", async () => {
    isEmailConfigured.mockReturnValue(false)
    expect(await sendBrokerUpdate(CARRIER, LOAD, "in_transit")).toEqual({ sent: false, reason: "not_configured" })
    expect(sendMail).not.toHaveBeenCalled()
    expect(insertedEvent()).toBeNull()
  })

  it("sends the pickup fact with the live tracking link and records the event", async () => {
    const r = await sendBrokerUpdate(CARRIER, LOAD, "at_pickup")
    expect(r).toEqual({ sent: true, to: "track@pacificcrest.com", stage: "at_pickup" })
    const mail = sendMail.mock.calls[0][0]
    expect(mail.to).toBe("track@pacificcrest.com")
    expect(mail.subject).toBe("Thind Transport — Load THD-1042 (your ref PCL-99120): at pickup")
    expect(mail.text).toContain("arrived at pickup in Kent, WA")
    expect(mail.text).toContain("https://thindtransport.com/track/live-token")
    expect(insertedEvent()).toEqual({ type: "broker_update", stage: "at_pickup", to: "track@pacificcrest.com", eta: null })
    // Reused the live link rather than minting a new one per email.
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it("mints a tracking link only when no live one exists, attributed to nobody", async () => {
    routeQueryOne({ load: loadRow(), link: null })
    await sendBrokerUpdate(CARRIER, LOAD, "delivered", { actorId: null })
    expect(createShareLink).toHaveBeenCalledWith(CARRIER, LOAD, null)
    const mail = sendMail.mock.calls[0][0]
    expect(mail.text).toContain("/track/minted-token")
  })

  it("carries the ETA on the in-transit update only, and notifies the office when it is late", async () => {
    loadEta.mockResolvedValue({
      eta: { at: new Date("2026-06-12T22:40:00Z"), miles: 120, driveHours: 2.5, basis: "physics", lateMinutes: 95, stale: false },
      target: { stopId: "s2", type: "delivery", city: "Fresno", state: "CA", apptStart: null, apptEnd: null },
    } as never)
    const r = await sendBrokerUpdate(CARRIER, LOAD, "in_transit")
    expect(r.sent).toBe(true)
    const mail = sendMail.mock.calls[0][0]
    expect(mail.text).toMatch(/rolling toward Fresno, CA\. ETA ~/)
    expect(insertedEvent().eta).toBe("2026-06-12T22:40:00.000Z")
    // The broker got the fact. The slip is the office's problem.
    expect(mail.text).not.toMatch(/late|behind/i)
    expect(notifyRoles).toHaveBeenCalledWith(
      CARRIER, ["dispatcher", "owner"],
      expect.objectContaining({ kind: "eta_late", link: `/hub/loads/${LOAD}` })
    )
  })

  it("does not compute an ETA for pickup or delivery updates", async () => {
    await sendBrokerUpdate(CARRIER, LOAD, "at_pickup")
    await sendBrokerUpdate(CARRIER, LOAD, "delivered")
    expect(loadEta).not.toHaveBeenCalled()
  })

  it("reports a failed send without recording an event, so the next transition can retry nothing it should not", async () => {
    sendMail.mockRejectedValueOnce(new Error("535 BadCredentials"))
    expect(await sendBrokerUpdate(CARRIER, LOAD, "delivered")).toEqual({ sent: false, reason: "send_failed" })
    expect(insertedEvent()).toBeNull()
  })

  it("scopes every query to the carrier", async () => {
    await sendBrokerUpdate(CARRIER, LOAD, "in_transit")
    const calls = [...queryOneMock.mock.calls, ...queryMock.mock.calls] as [string, unknown[]][]
    expect(calls.length).toBeGreaterThan(3)
    for (const [sql, params] of calls) {
      const s = String(sql)
      // Reads and the dedupe check filter by carrier; the event INSERT writes
      // it. Either way the carrier is $1 and it is never absent.
      expect(s).toMatch(/^\s*INSERT/.test(s) ? /\(carrier_id,/ : /carrier_id = \$1/)
      expect(params[0]).toBe(CARRIER)
    }
  })
})

describe("wording and helpers", () => {
  it("pins the three lines of fact", () => {
    expect(updateLine("at_pickup", STOPS as never, null)).toBe("Our truck has arrived at pickup in Kent, WA.")
    expect(updateLine("in_transit", STOPS as never, null)).toBe("Picked up and rolling toward Fresno, CA.")
    expect(updateLine("delivered", STOPS as never, null)).toBe("Delivered in Fresno, CA.")
    expect(updateLine("delivered", [], null)).toBe("Delivered in the delivery location.")
  })

  it("recognises RFC 2606 reserved addresses", () => {
    for (const a of ["x@example.com", "x@foo.example", "x@bar.test", "x@baz.invalid", "x@Example.COM"]) {
      expect(isReservedAddress(a)).toBe(true)
    }
    expect(isReservedAddress("track@pacificcrest.com")).toBe(false)
    expect(isReservedAddress("ops@examplefreight.com")).toBe(false)
  })

  it("prefers the app host, then the site URL, then the carrier site — always absolute", () => {
    delete process.env.NEXT_PUBLIC_APP_HOST
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(publicOrigin()).toBe("https://thindtransport.com")
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.test/"
    expect(publicOrigin()).toBe("https://staging.example.test")
    process.env.NEXT_PUBLIC_APP_HOST = "app.loadoff.com"
    expect(publicOrigin()).toBe("https://app.loadoff.com")
    delete process.env.NEXT_PUBLIC_APP_HOST
    delete process.env.NEXT_PUBLIC_SITE_URL
  })
})
