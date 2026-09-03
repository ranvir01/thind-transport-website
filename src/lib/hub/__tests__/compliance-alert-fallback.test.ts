/**
 * The compliance-scan cron used to have exactly one delivery channel: an
 * email to settings.notifications.officeEmail. Production SMTP has twice sat
 * on a rejected Gmail app password for a week at a time (535-5.7.8 Username
 * and Password not accepted — 2026-08-07→08-13, then 08-28→09-03), and on
 * every one of those days the scan computed its 60/30/7-day and overdue
 * warnings and then threw them away with the failed send. Nobody was told a
 * medical card or an annual inspection had aged out.
 *
 * So the alerts now land in hub.notifications FIRST and go to email second.
 * These cases pin the two halves of that contract that are easy to regress:
 * the in-app copy is written even when the send explodes, and the send
 * failure still propagates so the cron run stays red and /api/hub/cron/health
 * keeps showing the broken credential instead of passing on the fallback.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("../settings", () => ({ getCarrierSettings: vi.fn() }))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(),
  isEmailConfigured: vi.fn(() => true),
  mailFrom: vi.fn((name: string) => `"${name}" <office@example.com>`),
}))

import { query } from "../db"
import { notifyRoles } from "../notify"
import { getCarrierSettings } from "../settings"
import { createMailTransport, isEmailConfigured } from "@/lib/mailer"
import { alertableEntries, runComplianceAlerts, type ComplianceEntry } from "../compliance"
import { lastCompletedQuarterKey } from "../ifta-core"

const queryMock = vi.mocked(query)
const notifyRolesMock = vi.mocked(notifyRoles)
const CARRIER = "11111111-1111-1111-1111-111111111111"

// Same reason compliance.test.ts pins its clock: the always-appended IFTA and
// filings entries are calendar-driven, so an unpinned suite goes red on a date
// nobody changed any code on.
const PINNED_CLOCK = new Date(Date.UTC(2026, 5, 15, 12))

beforeAll(() => vi.useFakeTimers({ toFake: ["Date"] }))
afterAll(() => vi.useRealTimers())

/** A driver whose CDL is exactly `days` out, which is what the scan alerts on. */
function driverDue(days: number) {
  const due = new Date(PINNED_CLOCK.getTime() + days * 86400000).toISOString()
  const far = new Date(PINNED_CLOCK.getTime() + 400 * 86400000).toISOString()
  return { id: "d1", name: "Jaspreet Singh", cdl_expiry: due, medical_card_expiry: far }
}

/** Route by SQL, defaulting everything derived to a quiet green (see compliance.test.ts). */
function stubRows(opts: { drivers?: unknown[]; recentNotification?: boolean } = {}) {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql)
    if (s.includes("FROM hub.notifications")) return (opts.recentNotification ? [{ "?column?": 1 }] : []) as never
    if (s.includes("FROM hub.drivers")) return (opts.drivers ?? []) as never
    if (s.includes("hub.position_pings") && s.includes("hub.dvirs")) return [] as never
    if (s.includes("mcs-150") || s.includes("%ucr%")) return [{ due_on: null }] as never
    if (s.includes("FROM hub.ifta_reports")) {
      return [{ quarter: lastCompletedQuarterKey(new Date()), status: "filed" }] as never
    }
    return [] as never
  })
}

beforeEach(() => {
  vi.setSystemTime(PINNED_CLOCK)
  queryMock.mockReset()
  notifyRolesMock.mockReset().mockResolvedValue(undefined)
  vi.mocked(isEmailConfigured).mockReset().mockReturnValue(true)
  vi.mocked(createMailTransport).mockReset()
  vi.mocked(getCarrierSettings).mockReset().mockResolvedValue({
    notifications: { officeEmail: "office@thindtransport.com" },
  } as never)
})

describe("alertableEntries", () => {
  const at = (days: number, color: ComplianceEntry["color"] = "amber"): ComplianceEntry => ({
    entity: "driver", entityId: "d", name: "D", kind: `${days}d`,
    due: new Date(PINNED_CLOCK.getTime() + days * 86400000).toISOString(),
    color, href: "/hub/drivers/d",
  })

  it("takes the 60/30/7-day warnings and anything overdue, and nothing else", () => {
    const entries = [at(90), at(60), at(45), at(30), at(14), at(7), at(1), at(-3, "red")]
    expect(alertableEntries(entries, PINNED_CLOCK).map((e) => e.kind)).toEqual([
      "60d", "30d", "7d", "-3d",
    ])
  })

  it("leaves a past due date alone when its own module already calls it green", () => {
    // A filed IFTA quarter keeps its 2026-04-30 due date and goes green. On a
    // bare date test it was mailed out as "(EXPIRED)" every day, forever.
    expect(alertableEntries([at(-46, "green")], PINNED_CLOCK)).toEqual([])
  })

  it("ignores an entry with no due date — 'unknown' is for the wall, not the inbox", () => {
    const noDue: ComplianceEntry = {
      entity: "truck", entityId: "t", name: "Truck #7", kind: "Registration",
      due: null, color: "amber", href: "/hub/fleet/trucks/t",
    }
    expect(alertableEntries([noDue], PINNED_CLOCK)).toEqual([])
  })
})

describe("runComplianceAlerts — in-app first, email second", () => {
  it("writes the in-app notification and emails when SMTP is healthy", async () => {
    stubRows({ drivers: [driverDue(30)] })
    const sendMail = vi.fn(async () => undefined)
    vi.mocked(createMailTransport).mockReturnValue({ sendMail } as never)

    const result = await runComplianceAlerts(CARRIER, "Thind Transport")

    expect(result).toEqual({ alerts: 1, notified: true, emailed: true })
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner", "dispatcher"],
      expect.objectContaining({ kind: "compliance_alert", link: "/hub/compliance" })
    )
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it("still delivers in-app when the send fails, and rethrows so the run stays red", async () => {
    stubRows({ drivers: [driverDue(-2)] })
    vi.mocked(createMailTransport).mockReturnValue({
      sendMail: vi.fn(async () => {
        throw new Error("Invalid login: 535-5.7.8 Username and Password not accepted")
      }),
    } as never)

    await expect(runComplianceAlerts(CARRIER, "Thind Transport")).rejects.toThrow(
      /delivered in-app instead.*535-5\.7\.8/s
    )
    // The whole point: the warning reached the office even though email did not.
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
  })

  it("notifies before it sends, so a throw can never beat the fallback", async () => {
    stubRows({ drivers: [driverDue(7)] })
    const order: string[] = []
    notifyRolesMock.mockImplementation(async () => void order.push("notify"))
    vi.mocked(createMailTransport).mockReturnValue({
      sendMail: vi.fn(async () => void order.push("email")),
    } as never)

    await runComplianceAlerts(CARRIER, "Thind Transport")

    expect(order).toEqual(["notify", "email"])
  })

  it("does not re-page the office when a run in the last 20 hours already did", async () => {
    stubRows({ drivers: [driverDue(60)], recentNotification: true })
    const sendMail = vi.fn(async () => undefined)
    vi.mocked(createMailTransport).mockReturnValue({ sendMail } as never)

    const result = await runComplianceAlerts(CARRIER, "Thind Transport")

    expect(result.notified).toBe(false)
    expect(notifyRolesMock).not.toHaveBeenCalled()
    // The email is not deduped — it is the channel a human actually watches.
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it("says nothing at all when nothing is due", async () => {
    stubRows({ drivers: [driverDue(180)] })
    const result = await runComplianceAlerts(CARRIER, "Thind Transport")
    expect(result).toEqual({ alerts: 0, notified: false, emailed: false, reason: "no_alerts" })
    expect(notifyRolesMock).not.toHaveBeenCalled()
  })

  it("keeps the in-app copy when SMTP is not configured at all", async () => {
    stubRows({ drivers: [driverDue(30)] })
    vi.mocked(isEmailConfigured).mockReturnValue(false)

    const result = await runComplianceAlerts(CARRIER, "Thind Transport")

    expect(result).toEqual({ alerts: 1, notified: true, emailed: false, reason: "not_configured" })
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
    expect(createMailTransport).not.toHaveBeenCalled()
  })

  it("keeps the in-app copy when the carrier has no office email on file", async () => {
    stubRows({ drivers: [driverDue(30)] })
    vi.mocked(getCarrierSettings).mockResolvedValue({ notifications: { officeEmail: null } } as never)

    const result = await runComplianceAlerts(CARRIER, "Thind Transport")

    expect(result).toEqual({ alerts: 1, notified: true, emailed: false, reason: "no_office_email" })
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
  })
})
