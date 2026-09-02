/**
 * /api/hub/files/[name] enforced tenancy and a portal ACL for broker/shipper,
 * but role 'driver' fell through to the plain same-carrier check. Any signed-in
 * driver could therefore read every file their carrier owned from a filename
 * alone — other drivers' CDL and medical-card scans, and every settlement
 * statement in the company. driverFileVisible is the ACL that closed it, and
 * it grants exactly what the driver app already surfaces: documents on their
 * own loads, their own driver documents, their own approved/paid settlements.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { queryOne } from "../db"
import { driverFileVisible } from "../driver-app"

const queryOneMock = vi.mocked(queryOne)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const DRIVER = "dddddddd-dddd-dddd-dddd-dddddddddddd"

beforeEach(() => {
  queryOneMock.mockReset()
  queryOneMock.mockResolvedValue(null)
})

describe("driverFileVisible", () => {
  it("resolves the account with the driver + active guard, scoped to the carrier", async () => {
    await driverFileVisible(CARRIER, USER, "pod.pdf")
    const [sql, params] = queryOneMock.mock.calls[0]
    expect(String(sql)).toContain("role = 'driver' AND active")
    expect(String(sql)).toContain("id = $1 AND carrier_id = $2")
    expect(params).toEqual([USER, CARRIER])
  })

  it("refuses when the account is missing, deactivated, or unlinked — without running the claim query", async () => {
    queryOneMock.mockResolvedValueOnce(null)
    expect(await driverFileVisible(CARRIER, USER, "pod.pdf")).toBe(false)
    queryOneMock.mockResolvedValueOnce({ driver_id: null })
    expect(await driverFileVisible(CARRIER, USER, "pod.pdf")).toBe(false)
    expect(queryOneMock).toHaveBeenCalledTimes(2)
  })

  it("scopes every branch of the claim to THIS driver, basename-flattened", async () => {
    queryOneMock
      .mockResolvedValueOnce({ driver_id: DRIVER })
      .mockResolvedValueOnce(null)
    const visible = await driverFileVisible(CARRIER, USER, "../../etc/secret.pdf")
    expect(visible).toBe(false)
    const [sql, params] = queryOneMock.mock.calls[1]
    const text = String(sql)
    // Documents on loads assigned to them, with the both-sides join guard.
    expect(text).toContain("JOIN hub.loads l ON l.id = d.entity_id AND d.entity_type = 'load' AND l.carrier_id = d.carrier_id")
    expect(text).toContain("l.driver_id = $3")
    expect(text).toContain("l.deleted_at IS NULL")
    // Their own driver documents — entity_id is the driver, never just the carrier.
    expect(text).toContain("entity_type = 'driver' AND entity_id = $3")
    // Their own settlements, and only ones the driver app already shows.
    expect(text).toContain("driver_id = $3 AND status IN ('approved','paid')")
    // Photos on their own direct thread with the office — and only theirs.
    expect(text).toContain("JOIN hub.message_threads t ON t.id = d.entity_id AND d.entity_type = 'message' AND t.carrier_id = d.carrier_id")
    expect(text).toContain("t.driver_id = $3")
    expect(params).toEqual([
      "/api/hub/files/secret.pdf",
      CARRIER,
      DRIVER,
      "/hub/secret.pdf".length,
      "/hub/secret.pdf",
    ])
  })

  it("never grants on carrier scope alone — $3 (the driver) constrains all four branches", async () => {
    // The bug being fixed was exactly this: same-carrier was treated as
    // sufficient. Every branch must narrow past carrier_id.
    queryOneMock
      .mockResolvedValueOnce({ driver_id: DRIVER })
      .mockResolvedValueOnce(null)
    await driverFileVisible(CARRIER, USER, "pod.pdf")
    const text = String(queryOneMock.mock.calls[1][0])
    const branches = text.split("UNION ALL")
    expect(branches).toHaveLength(4)
    for (const branch of branches) expect(branch).toContain("$3")
  })

  it("never reads invoices — a driver has no business in customer billing", async () => {
    queryOneMock
      .mockResolvedValueOnce({ driver_id: DRIVER })
      .mockResolvedValueOnce(null)
    await driverFileVisible(CARRIER, USER, "pod.pdf")
    expect(String(queryOneMock.mock.calls[1][0])).not.toContain("hub.invoices")
  })

  it("matches legacy absolute blob URLs too, so a driver's older PODs keep opening", async () => {
    queryOneMock
      .mockResolvedValueOnce({ driver_id: DRIVER })
      .mockResolvedValueOnce(null)
    await driverFileVisible(CARRIER, USER, "uuid-pod.pdf")
    const text = String(queryOneMock.mock.calls[1][0])
    expect(text).toContain("LIKE 'https://%'")
    expect(text).toContain("right(d.url, $4::int) = $5::text")
  })

  it("allows a file one of the three producers claims for this driver", async () => {
    queryOneMock
      .mockResolvedValueOnce({ driver_id: DRIVER })
      .mockResolvedValueOnce({ ok: 1 })
    expect(await driverFileVisible(CARRIER, USER, "pod.pdf")).toBe(true)
  })
})
