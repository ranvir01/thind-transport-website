/**
 * Truck-subsystem audit (1c-style), equipment-compliance surface of the
 * weekly owner digest.
 *
 * Finding (fixed): sendOwnerDigest counted only expired driver CDL/med cards
 * and, when clean, told the owner "Compliance: no expired ... documents" —
 * blind to expired truck registration, annual inspection, and INSURANCE (and
 * trailer registration/inspection). complianceEntries already surfaces all of
 * these on the wall/Today/daily cron; the Monday summary silently omitted them,
 * so an uninsured truck (an out-of-service liability) could read as "all clear."
 * Same class as the trailer audit (b003891) that taught complianceEntries about
 * trailers. Fix counts red equipment and refuses the all-clear while any is red.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryOneMock, sendMail } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  sendMail: vi.fn(async (_opts: { text: string }) => undefined),
}))

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: queryOneMock,
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    notifications: { officeEmail: "office@thind.test" },
  })),
}))
vi.mock("@/lib/mailer", () => ({
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "fleet@thind.test"),
}))

import { sendOwnerDigest } from "../digest"

const CARRIER = "carrier-1"

const baseStats = {
  revenue_week: "0", delivered_week: "0", unbilled: "0",
  ar_open: "0", ar_overdue: "0", settlements_draft: "0",
  red_compliance_drivers: "0", red_compliance_equipment: "0", empty_trucks: "0",
}

/** The text body handed to sendMail on the last send. */
function sentBody(): string {
  const call = sendMail.mock.calls.at(-1)
  return String((call?.[0] as { text: string }).text)
}

beforeEach(() => {
  queryOneMock.mockReset()
  sendMail.mockClear()
})

describe("sendOwnerDigest — equipment compliance", () => {
  it("surfaces expired truck/trailer equipment even when every driver is clear", async () => {
    // A truck's insurance is expired; no driver doc is. Pre-fix this rendered
    // the reassuring 'no expired driver documents' all-clear.
    queryOneMock.mockResolvedValue({
      ...baseStats, red_compliance_drivers: "0", red_compliance_equipment: "2",
    })

    const res = await sendOwnerDigest(CARRIER)

    expect(res.sent).toBe(true)
    const body = sentBody()
    expect(body).toContain("2 truck/trailer(s) with EXPIRED registration, inspection, or insurance")
    // The all-clear line must NOT appear while equipment is red.
    expect(body).not.toContain("no expired driver or equipment documents")
    expect(body).not.toMatch(/no expired driver documents/)
  })

  it("counts trucks (incl. insurance) AND trailers in the stats query", async () => {
    queryOneMock.mockResolvedValue({ ...baseStats })
    await sendOwnerDigest(CARRIER)

    const sql = String(queryOneMock.mock.calls[0][0])
    // Trucks: all three equipment expiries feed the count.
    expect(sql).toMatch(/hub\.trucks[\s\S]*insurance_expiry\s*<\s*CURRENT_DATE/)
    expect(sql).toMatch(/registration_expiry\s*<\s*CURRENT_DATE/)
    expect(sql).toMatch(/inspection_due\s*<\s*CURRENT_DATE/)
    // Trailers are counted too, not just trucks.
    expect(sql).toMatch(/hub\.trailers/)
    expect(sql).toContain("AS red_compliance_equipment")
    // Every equipment subquery is carrier-scoped and skips retired/deleted units.
    expect(sql).toMatch(/hub\.trucks WHERE carrier_id = \$1 AND deleted_at IS NULL AND status <> 'retired'/)
    expect(sql).toMatch(/hub\.trailers WHERE carrier_id = \$1 AND deleted_at IS NULL AND status <> 'retired'/)
  })

  it("both drivers and equipment red → one warning line lists both", async () => {
    queryOneMock.mockResolvedValue({
      ...baseStats, red_compliance_drivers: "1", red_compliance_equipment: "3",
    })
    await sendOwnerDigest(CARRIER)

    const body = sentBody()
    expect(body).toContain("1 driver(s) with an EXPIRED CDL or med card")
    expect(body).toContain("3 truck/trailer(s) with EXPIRED registration, inspection, or insurance")
  })

  it("everything clean → honest all-clear naming both drivers and equipment", async () => {
    queryOneMock.mockResolvedValue({ ...baseStats })
    await sendOwnerDigest(CARRIER)

    const body = sentBody()
    expect(body).toContain("Compliance: no expired driver or equipment documents")
    expect(body).not.toContain("EXPIRED")
  })

  it("no office email on file → nothing sent", async () => {
    // Guard the early return still holds after the change.
    const settings = await import("../settings")
    vi.mocked(settings.getCarrierSettings).mockResolvedValueOnce({
      notifications: { officeEmail: "" },
    } as Awaited<ReturnType<typeof settings.getCarrierSettings>>)

    const res = await sendOwnerDigest(CARRIER)
    expect(res.sent).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
