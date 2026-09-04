/**
 * The owner-digest cron used to have exactly one delivery channel: an
 * email to settings.notifications.officeEmail. Production SMTP has twice sat
 * on a rejected Gmail app password for a week at a time (535-5.7.8 Username
 * and Password not accepted — 2026-08-07→08-13, then 08-28→09-03), and on
 * every one of those Mondays the digest computed its numbers and then threw
 * them away with the failed send. Nobody saw booked revenue, open AR, or
 * expired docs in the Hub either.
 *
 * So the Monday numbers now land in hub.notifications FIRST and go to email
 * second — the same contract as runComplianceAlerts. These cases pin the
 * halves that are easy to regress: the in-app copy is written even when the
 * send explodes, and the send failure still propagates so the cron run stays
 * red and /api/hub/cron/health keeps showing the broken credential.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    notifications: { officeEmail: "office@thindtransport.com" },
  })),
}))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(),
  isEmailConfigured: vi.fn(() => true),
  mailFrom: vi.fn((name: string) => `"${name}" <office@example.com>`),
}))

import { query, queryOne } from "../db"
import { notifyRoles } from "../notify"
import { getCarrierSettings } from "../settings"
import { createMailTransport, isEmailConfigured } from "@/lib/mailer"
import { sendOwnerDigest } from "../digest"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const notifyRolesMock = vi.mocked(notifyRoles)
const CARRIER = "11111111-1111-1111-1111-111111111111"

const STATS = {
  revenue_week: "2500000",
  delivered_week: "4",
  unbilled: "1",
  ar_open: "800000",
  ar_overdue: "1",
  settlements_draft: "2",
  red_compliance_drivers: "0",
  red_compliance_equipment: "0",
  empty_trucks: "3",
}

function stubRows(opts: { recentNotification?: boolean } = {}) {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.notifications")) {
      return (opts.recentNotification ? [{ "?column?": 1 }] : []) as never
    }
    return [] as never
  })
}

beforeEach(() => {
  queryMock.mockReset()
  queryOneMock.mockReset().mockResolvedValue({ ...STATS })
  notifyRolesMock.mockReset().mockResolvedValue(undefined)
  vi.mocked(isEmailConfigured).mockReset().mockReturnValue(true)
  vi.mocked(createMailTransport).mockReset()
  vi.mocked(getCarrierSettings).mockReset().mockResolvedValue({
    notifications: { officeEmail: "office@thindtransport.com" },
  } as never)
  stubRows()
})

describe("sendOwnerDigest — in-app first, email second", () => {
  it("writes the in-app notification and emails when SMTP is healthy", async () => {
    const sendMail = vi.fn(async () => undefined)
    vi.mocked(createMailTransport).mockReturnValue({ sendMail } as never)

    const result = await sendOwnerDigest(CARRIER)

    expect(result).toEqual({ sent: true, notified: true, emailed: true })
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner"],
      expect.objectContaining({
        kind: "owner_digest",
        title: "Thind Transport — your Monday numbers",
        link: "/hub",
      })
    )
    expect(String(notifyRolesMock.mock.calls[0][2].body)).toContain("Owed to you:")
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it("still delivers in-app when the send fails, and rethrows so the run stays red", async () => {
    vi.mocked(createMailTransport).mockReturnValue({
      sendMail: vi.fn(async () => {
        throw new Error("Invalid login: 535-5.7.8 Username and Password not accepted")
      }),
    } as never)

    await expect(sendOwnerDigest(CARRIER)).rejects.toThrow(
      /delivered in-app instead.*535-5\.7\.8/s
    )
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
  })

  it("notifies before it sends, so a throw can never beat the fallback", async () => {
    const order: string[] = []
    notifyRolesMock.mockImplementation(async () => void order.push("notify"))
    vi.mocked(createMailTransport).mockReturnValue({
      sendMail: vi.fn(async () => void order.push("email")),
    } as never)

    await sendOwnerDigest(CARRIER)

    expect(order).toEqual(["notify", "email"])
  })

  it("does not re-page the office when a run in the last 20 hours already did", async () => {
    stubRows({ recentNotification: true })
    const sendMail = vi.fn(async () => undefined)
    vi.mocked(createMailTransport).mockReturnValue({ sendMail } as never)

    const result = await sendOwnerDigest(CARRIER)

    expect(result.notified).toBe(false)
    expect(notifyRolesMock).not.toHaveBeenCalled()
    // The email is not deduped — it is the channel a human actually watches.
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it("keeps the in-app copy when SMTP is not configured at all", async () => {
    vi.mocked(isEmailConfigured).mockReturnValue(false)

    const result = await sendOwnerDigest(CARRIER)

    expect(result).toEqual({ sent: false, notified: true, emailed: false, reason: "not_configured" })
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
    expect(createMailTransport).not.toHaveBeenCalled()
  })

  it("keeps the in-app copy when the carrier has no office email on file", async () => {
    vi.mocked(getCarrierSettings).mockResolvedValue({ notifications: { officeEmail: null } } as never)

    const result = await sendOwnerDigest(CARRIER)

    expect(result).toEqual({ sent: false, notified: true, emailed: false, reason: "no_office_email" })
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
  })

  it("says nothing at all when the stats query returns nothing", async () => {
    queryOneMock.mockResolvedValue(null)

    const result = await sendOwnerDigest(CARRIER)

    expect(result).toEqual({ sent: false, notified: false, emailed: false, reason: "no_stats" })
    expect(notifyRolesMock).not.toHaveBeenCalled()
    expect(createMailTransport).not.toHaveBeenCalled()
  })

  it("scopes the in-app dedupe read to this carrier and owner_digest", async () => {
    const sendMail = vi.fn(async () => undefined)
    vi.mocked(createMailTransport).mockReturnValue({ sendMail } as never)

    await sendOwnerDigest(CARRIER)

    const dedupe = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes("FROM hub.notifications")
    )
    expect(dedupe).toBeDefined()
    expect(String(dedupe![0])).toMatch(/carrier_id = \$1/)
    expect(String(dedupe![0])).toContain("kind = 'owner_digest'")
    expect(dedupe![1]).toEqual([CARRIER])
  })
})
