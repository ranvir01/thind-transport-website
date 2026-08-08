/**
 * The flag WRITE path (settings-UI toggle for nav.small_carrier_mode).
 *
 * Contracts under test: a cleared override is a DELETE, not enabled=FALSE
 * ("empty table = code defaults" stays literally true); an explicit choice
 * upserts exactly one carrier-scope row through the NULLS NOT DISTINCT
 * unique target; and the server action maps trimmed/full/default onto
 * true/false/null, owner-gated.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async (_sql: string, _params?: unknown[]) => [] as unknown[]),
  queryOneMock: vi.fn(async (_sql: string, _params?: unknown[]) => null as unknown),
}))
vi.mock("@/lib/hub/db", () => ({ query: queryMock, queryOne: queryOneMock }))
vi.mock("@/lib/hub/session", () => ({ requireOwner: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { getCarrierFlagOverride, setCarrierFlag } from "../flags"
import { setNavigationModeAction } from "@/app/hub/_actions/company"
import { requireOwner } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"

const OWNER = { id: "u1", name: "Owner", email: "o@x.test", role: "owner" as const, carrierId: "carrier-1" }

beforeEach(() => {
  queryMock.mockClear()
  queryOneMock.mockReset().mockResolvedValue(null)
  vi.mocked(requireOwner).mockReset().mockResolvedValue(OWNER)
  vi.mocked(logAudit).mockClear()
})

describe("setCarrierFlag", () => {
  it("clears an override by deleting the row, scoped to flag + carrier", async () => {
    await setCarrierFlag("nav.small_carrier_mode", "carrier-1", null)
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]!
    expect(String(sql)).toContain("DELETE FROM hub.feature_flags")
    expect(String(sql)).toContain("scope = 'carrier'")
    expect(params).toEqual(["nav.small_carrier_mode", "carrier-1"])
  })

  it("upserts one carrier-scope row for an explicit choice", async () => {
    await setCarrierFlag("nav.small_carrier_mode", "carrier-1", true, { id: "u1" })
    const [sql, params] = queryMock.mock.calls[0]!
    expect(String(sql)).toContain("INSERT INTO hub.feature_flags")
    expect(String(sql)).toContain("'carrier'")
    expect(String(sql)).toContain("ON CONFLICT (flag_key, scope, carrier_id, role, user_id)")
    expect(String(sql)).toContain("to_jsonb($4::boolean)")
    // Re-choosing must also revive a row that was disabled or expired.
    expect(String(sql)).toContain("enabled = TRUE")
    expect(String(sql)).toContain("expires_at = NULL")
    expect(params).toEqual(["nav.small_carrier_mode", "permission", "carrier-1", true, "u1"])
  })
})

describe("getCarrierFlagOverride", () => {
  it("maps a stored row to its boolean and absence to null", async () => {
    queryOneMock.mockResolvedValueOnce({ value: true })
    await expect(getCarrierFlagOverride("nav.small_carrier_mode", "carrier-1")).resolves.toBe(true)
    queryOneMock.mockResolvedValueOnce({ value: false })
    await expect(getCarrierFlagOverride("nav.small_carrier_mode", "carrier-1")).resolves.toBe(false)
    queryOneMock.mockResolvedValueOnce(null)
    await expect(getCarrierFlagOverride("nav.small_carrier_mode", "carrier-1")).resolves.toBeNull()
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]]
    expect(String(sql)).toContain("carrier_id = $2")
    expect(params).toEqual(["nav.small_carrier_mode", "carrier-1"])
  })
})

describe("setNavigationModeAction", () => {
  it("maps trimmed → true, full → false, default → cleared override", async () => {
    await setNavigationModeAction("trimmed")
    expect(queryMock.mock.calls[0]![1]![3]).toBe(true)

    queryMock.mockClear()
    await setNavigationModeAction("full")
    expect(queryMock.mock.calls[0]![1]![3]).toBe(false)

    queryMock.mockClear()
    const result = await setNavigationModeAction("default")
    expect(result.ok).toBe(true)
    expect(String(queryMock.mock.calls[0]![0])).toContain("DELETE FROM hub.feature_flags")
    expect(vi.mocked(logAudit)).toHaveBeenCalled()
  })

  it("rejects a non-owner before touching the table", async () => {
    vi.mocked(requireOwner).mockRejectedValueOnce(new Error("Forbidden: owners only"))
    const result = await setNavigationModeAction("trimmed")
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("rejects an unknown mode from a tampered request", async () => {
    const result = await setNavigationModeAction("everything" as never)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Unknown navigation mode")
    expect(queryMock).not.toHaveBeenCalled()
  })
})
