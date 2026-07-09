/**
 * applyDetentionAccrual: detention now bills itself the moment a stop closes
 * (office or driver side) instead of waiting for a dispatcher to notice and
 * click "Add detention". Regression targets: it upserts a single "Detention"
 * line (never appends a second one), never shrinks or removes an
 * already-billed amount, and is a no-op when the computed total hasn't
 * changed since the last run (idempotent against repeat departed_at writes).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, getLoad, getLoadStops, addLoadEvent, logAudit } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => []),
  getLoad: vi.fn(),
  getLoadStops: vi.fn(),
  addLoadEvent: vi.fn(async () => undefined),
  logAudit: vi.fn(async () => undefined),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: vi.fn(async () => null) }))
vi.mock("../settings", () => ({
  getCarrierSettings: vi.fn(async () => ({
    detention: { freeHours: 2, ratePerHourCents: 6000 },
  })),
}))
vi.mock("../loads", () => ({ getLoad, getLoadStops, addLoadEvent }))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => undefined) }))
vi.mock("../audit", () => ({ logAudit }))

import { applyDetentionAccrual } from "../detention"

const ACTOR = { id: "user-1", name: "Dispatch" }
const CLOSED_STOP = {
  city: "Kent", state: "WA",
  arrived_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  departed_at: new Date().toISOString(),
} // 4h dwell - 2h free = 2h billable @ $60/hr = $12000

describe("applyDetentionAccrual", () => {
  beforeEach(() => {
    queryMock.mockClear()
    getLoad.mockReset()
    getLoadStops.mockReset()
    addLoadEvent.mockClear()
    logAudit.mockClear()
  })

  it("returns not-found when the load doesn't exist", async () => {
    getLoad.mockResolvedValue(null)
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: false, changed: false, amountCents: 0, error: "Load not found" })
  })

  it("is a no-op when no stop dwelled past free time", async () => {
    getLoad.mockResolvedValue({ accessorials: [] })
    getLoadStops.mockResolvedValue([{ city: "Kent", state: "WA", arrived_at: null, departed_at: null }])
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: true, changed: false, amountCents: 0 })
    expect(queryMock).not.toHaveBeenCalled()
    expect(addLoadEvent).not.toHaveBeenCalled()
  })

  it("drafts a fresh Detention accessorial from a closed dwelling stop", async () => {
    getLoad.mockResolvedValue({ accessorials: [] })
    getLoadStops.mockResolvedValue([CLOSED_STOP])
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: true, changed: true, amountCents: 12000 })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.loads SET accessorials"),
      ["carrier-1", "load-1", JSON.stringify([{ label: "Detention", amount_cents: 12000 }])]
    )
    expect(addLoadEvent).toHaveBeenCalledWith(
      "carrier-1", "load-1", "detention",
      expect.objectContaining({ amount_cents: 12000 }), ACTOR
    )
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "detention_drafted" }))
  })

  it("is a no-op when the accessorial already reflects the current total", async () => {
    getLoad.mockResolvedValue({ accessorials: [{ label: "Detention", amount_cents: 12000 }] })
    getLoadStops.mockResolvedValue([CLOSED_STOP])
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: true, changed: false, amountCents: 12000 })
    expect(queryMock).not.toHaveBeenCalled()
    expect(addLoadEvent).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("upserts (not appends) the single Detention line when a later stop grows the total", async () => {
    getLoad.mockResolvedValue({
      accessorials: [{ label: "Detention", amount_cents: 12000 }, { label: "Lumper", amount_cents: 5000 }],
    })
    getLoadStops.mockResolvedValue([CLOSED_STOP, CLOSED_STOP])
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: true, changed: true, amountCents: 24000 })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE hub.loads SET accessorials"),
      [
        "carrier-1", "load-1",
        JSON.stringify([{ label: "Detention", amount_cents: 24000 }, { label: "Lumper", amount_cents: 5000 }]),
      ]
    )
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "detention_recomputed",
      oldValue: { amountCents: 12000 },
    }))
  })

  it("never shrinks an already-billed amount even if the computed total drops", async () => {
    getLoad.mockResolvedValue({ accessorials: [{ label: "Detention", amount_cents: 12000 }] })
    getLoadStops.mockResolvedValue([{ city: "Kent", state: "WA", arrived_at: null, departed_at: null }])
    const result = await applyDetentionAccrual("carrier-1", "load-1", ACTOR)
    expect(result).toEqual({ ok: true, changed: false, amountCents: 12000 })
    expect(queryMock).not.toHaveBeenCalled()
  })
})
