/**
 * Recurring lanes: "rebook every Tuesday" rules stored in carrier settings
 * JSONB, booked by the daily recurring-rebook cron through the same
 * copy/strip matrix as the Duplicate button. The cron must be idempotent
 * (lastRunDate stamp), carrier-local (America/Los_Angeles weekday), and must
 * disable — not retry forever — rules whose source can no longer rebook.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "user-1", name: "Dana", carrierId: "carrier-1", role: "dispatcher" })),
}))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/loads", () => ({
  createLoad: vi.fn(async () => ({ id: "load-new", reference: "THD-1002", linehaul_cents: 185000 })),
  getLoad: vi.fn(), getLoadStops: vi.fn(), addLoadEvent: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { query } from "@/lib/hub/db"
import { createLoad, getLoad, getLoadStops, addLoadEvent } from "@/lib/hub/loads"
import { logAudit } from "@/lib/hub/audit"
import { requirePermission } from "@/lib/hub/session"
import {
  carrierLocalParts, runRecurringRebooks, type RecurringLaneRule,
} from "@/lib/hub/recurring"
import { setRecurringLaneAction } from "@/app/hub/_actions/recurring"

const queryMock = vi.mocked(query)
const createLoadMock = vi.mocked(createLoad)
const getLoadMock = vi.mocked(getLoad)
const getLoadStopsMock = vi.mocked(getLoadStops)
const addLoadEventMock = vi.mocked(addLoadEvent)
const logAuditMock = vi.mocked(logAudit)
const requirePermissionMock = vi.mocked(requirePermission)

const sourceLoad = {
  id: "load-src", carrier_id: "carrier-1", reference: "THD-1001",
  customer_id: "cust-1", customer_reference: "PO-8891", status: "settled",
  equipment: "reefer", commodity: "Produce", weight_lbs: 42000,
  linehaul_cents: 185000, fuel_surcharge_cents: 21000,
  accessorials: [{ label: "Lumper", amount_cents: 7500 }],
  loaded_miles: 612, deadhead_miles: 48,
  truck_id: "truck-1", trailer_id: "trailer-1", driver_id: "driver-1",
  source: "dat", factored: true, notes: "Dedicated Tuesday lane",
} as never

const sourceStops = [
  {
    id: "stop-1", type: "pickup", facility: "Kent Cold Storage", address: "123 Rail Ave",
    city: "Kent", state: "WA", zip: "98032", fcfs: false,
    pickup_number: "PU-771", po_number: "PO-8891",
    appt_start: "2026-07-07T15:00:00Z", appt_end: "2026-07-07T17:00:00Z",
    lat: 47.38, lng: -122.23, notes: null,
  },
] as never[]

function rule(overrides: Partial<RecurringLaneRule> = {}): RecurringLaneRule {
  return {
    loadId: "load-src", reference: "THD-1001", weekday: 2, enabled: true,
    lastRunDate: null, lastLoadRef: null, lastError: null, ...overrides,
  }
}

/** Rules the SELECT returns; captures what the settings upsert saved. */
function primeRules(rules: RecurringLaneRule[]) {
  queryMock.mockImplementation(async (sql: string) => {
    if (/SELECT settings->'recurringLanes'/.test(sql)) return [{ rules }] as never
    return [] as never
  })
}

function savedRules(): RecurringLaneRule[] | null {
  const call = queryMock.mock.calls.find(([sql]) => /INSERT INTO hub\.carrier_settings/.test(sql))
  if (!call) return null
  return JSON.parse((call[1] as unknown[])[1] as string)
}

// 2026-07-14 is a Tuesday; 09:20 UTC = 02:20 PDT the same Tuesday.
const TUESDAY_CRON = new Date("2026-07-14T09:20:00Z")

beforeEach(() => {
  vi.clearAllMocks()
  requirePermissionMock.mockResolvedValue({ id: "user-1", name: "Dana", carrierId: "carrier-1", role: "dispatcher" } as never)
  getLoadMock.mockResolvedValue(sourceLoad)
  getLoadStopsMock.mockResolvedValue(sourceStops as never)
  createLoadMock.mockResolvedValue({ id: "load-new", reference: "THD-1002", linehaul_cents: 185000 } as never)
  primeRules([])
})

describe("carrierLocalParts", () => {
  it("maps a UTC cron instant to the carrier-local weekday and date", () => {
    expect(carrierLocalParts(TUESDAY_CRON)).toEqual({ weekday: 2, date: "2026-07-14" })
  })

  it("stays on the local day when UTC has already rolled over", () => {
    // 03:00 UTC Wednesday = 20:00 PDT Tuesday.
    expect(carrierLocalParts(new Date("2026-07-15T03:00:00Z"))).toEqual({ weekday: 2, date: "2026-07-14" })
  })

  it("handles standard time (PST) the same way", () => {
    // 2026-01-07 is a Wednesday; 09:20 UTC = 01:20 PST the same day.
    expect(carrierLocalParts(new Date("2026-01-07T09:20:00Z"))).toEqual({ weekday: 3, date: "2026-01-07" })
  })
})

describe("runRecurringRebooks", () => {
  it("books a due rule and stamps lastRunDate + lastLoadRef", async () => {
    primeRules([rule()])
    const result = await runRecurringRebooks("carrier-1", TUESDAY_CRON)
    expect(result).toEqual({ rules: 1, due: 1, booked: 1, disabled: 0 })

    const [carrierId, input, actor] = createLoadMock.mock.calls[0]
    expect(carrierId).toBe("carrier-1")
    expect(input.customer_id).toBe("cust-1")
    expect(input.source).toBe("direct")
    // Cron actor: no user id, provenance by name.
    expect(actor).toEqual({ id: null, name: "Recurring lane" })
    expect(addLoadEventMock).toHaveBeenCalledWith(
      "carrier-1", "load-new", "note",
      { note: "Rebooked weekly from THD-1001" },
      { id: null, name: "Recurring lane" }
    )
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      carrierId: "carrier-1", actorId: null, actorName: "Recurring lane",
      entityType: "load", entityId: "load-new", action: "create",
      newValue: expect.objectContaining({ duplicated_from: "THD-1001" }),
    }))

    const saved = savedRules()
    expect(saved).toEqual([
      expect.objectContaining({ lastRunDate: "2026-07-14", lastLoadRef: "THD-1002", enabled: true, lastError: null }),
    ])
  })

  it("skips rules that are disabled, on another weekday, or already run today", async () => {
    primeRules([
      rule({ enabled: false }),
      rule({ loadId: "load-b", weekday: 4 }),
      rule({ loadId: "load-c", lastRunDate: "2026-07-14" }),
    ])
    const result = await runRecurringRebooks("carrier-1", TUESDAY_CRON)
    expect(result).toEqual({ rules: 3, due: 0, booked: 0, disabled: 0 })
    expect(createLoadMock).not.toHaveBeenCalled()
    // Nothing changed — no settings write.
    expect(savedRules()).toBeNull()
  })

  it("is idempotent: rerunning the same day books nothing more", async () => {
    primeRules([rule({ lastRunDate: "2026-07-14", lastLoadRef: "THD-1002" })])
    const result = await runRecurringRebooks("carrier-1", TUESDAY_CRON)
    expect(result.booked).toBe(0)
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("disables a rule whose source can no longer rebook instead of retrying forever", async () => {
    getLoadMock.mockResolvedValue(null)
    primeRules([rule()])
    const result = await runRecurringRebooks("carrier-1", TUESDAY_CRON)
    expect(result).toEqual({ rules: 1, due: 1, booked: 0, disabled: 1 })
    expect(savedRules()).toEqual([
      expect.objectContaining({ enabled: false, lastError: "Load not found", lastRunDate: null }),
    ])
  })

  it("keeps other carriers' isolation: every query is carrier-scoped", async () => {
    primeRules([rule()])
    await runRecurringRebooks("carrier-1", TUESDAY_CRON)
    for (const [sql, params] of queryMock.mock.calls) {
      if (/carrier_settings/.test(sql)) expect((params as unknown[])[0]).toBe("carrier-1")
    }
    expect(getLoadMock).toHaveBeenCalledWith("carrier-1", "load-src")
  })
})

describe("setRecurringLaneAction", () => {
  it("refuses without loads:write", async () => {
    requirePermissionMock.mockRejectedValue(new Error("Forbidden"))
    const result = await setRecurringLaneAction("load-src", 2)
    expect(result.ok).toBe(false)
    expect(savedRules()).toBeNull()
  })

  it("returns not-found for a load outside the carrier", async () => {
    getLoadMock.mockResolvedValue(null)
    const result = await setRecurringLaneAction("load-elsewhere", 2)
    expect(result).toEqual({ ok: false, error: "Load not found" })
    expect(savedRules()).toBeNull()
  })

  it("rejects a bogus weekday before touching the database", async () => {
    expect(await setRecurringLaneAction("load-src", 7)).toEqual({ ok: false, error: "Pick a weekday" })
    expect(await setRecurringLaneAction("load-src", 1.5)).toEqual({ ok: false, error: "Pick a weekday" })
    expect(getLoadMock).not.toHaveBeenCalled()
  })

  it("schedules a weekly rebook: rule saved, timeline note, audit row", async () => {
    const result = await setRecurringLaneAction("load-src", 2)
    expect(result).toEqual({ ok: true, id: "load-src" })
    expect(savedRules()).toEqual([
      { loadId: "load-src", reference: "THD-1001", weekday: 2, enabled: true, lastRunDate: null, lastLoadRef: null, lastError: null },
    ])
    expect(addLoadEventMock).toHaveBeenCalledWith(
      "carrier-1", "load-src", "note",
      { note: "Weekly rebook scheduled: every Tuesday" },
      { id: "user-1", name: "Dana" }
    )
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "load", entityId: "load-src", action: "update",
      newValue: { recurring_weekday: 2, enabled: true },
    }))
  })

  it("moving the day resets the schedule but keeps the last booked ref for display", async () => {
    primeRules([rule({ lastRunDate: "2026-07-14", lastLoadRef: "THD-1002" })])
    await setRecurringLaneAction("load-src", 4)
    expect(savedRules()).toEqual([
      expect.objectContaining({ weekday: 4, enabled: true, lastRunDate: null, lastLoadRef: "THD-1002" }),
    ])
  })

  it("turning off removes the rule and leaves other lanes' rules alone", async () => {
    primeRules([rule(), rule({ loadId: "load-b", reference: "THD-0900", weekday: 5 })])
    const result = await setRecurringLaneAction("load-src", null)
    expect(result.ok).toBe(true)
    expect(savedRules()).toEqual([expect.objectContaining({ loadId: "load-b", weekday: 5 })])
    expect(addLoadEventMock).toHaveBeenCalledWith(
      "carrier-1", "load-src", "note",
      { note: "Weekly rebook turned off" },
      { id: "user-1", name: "Dana" }
    )
  })

  it("turning off with no rule is a quiet no-op", async () => {
    const result = await setRecurringLaneAction("load-src", null)
    expect(result).toEqual({ ok: true, id: "load-src" })
    expect(savedRules()).toBeNull()
    expect(addLoadEventMock).not.toHaveBeenCalled()
  })
})
