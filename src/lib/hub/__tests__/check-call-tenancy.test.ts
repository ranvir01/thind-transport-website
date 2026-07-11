/**
 * Regression (loads/dispatch subsystem audit, 1c-style sweep):
 * logCheckCallAction was the only addLoadEvent caller that wrote a
 * client-supplied loadId into hub.load_events without proving the load
 * belongs to the actor's carrier — a cross-tenant probe could pollute
 * another tenant's load id with event rows (cross-table writes guard
 * tenancy on both sides, AGENTS.md).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "Dispatcher", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/loads", () => ({
  getLoad: vi.fn(),
  addLoadEvent: vi.fn(async () => undefined),
  createLoad: vi.fn(),
  updateLoad: vi.fn(),
  changeLoadStatus: vi.fn(),
  replaceStops: vi.fn(),
  setStopTimestamp: vi.fn(),
  getLoadStops: vi.fn(),
}))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))

import { getLoad, addLoadEvent } from "@/lib/hub/loads"
import { logCheckCallAction } from "@/app/hub/_actions/loads"

const getLoadMock = vi.mocked(getLoad)
const addLoadEventMock = vi.mocked(addLoadEvent)

beforeEach(() => {
  getLoadMock.mockReset()
  addLoadEventMock.mockClear()
})

describe("logCheckCallAction", () => {
  it("refuses a loadId that is not the carrier's before writing any event", async () => {
    getLoadMock.mockResolvedValue(null)
    const result = await logCheckCallAction("foreign-load", "checked in")
    expect(result).toEqual({ ok: false, error: "Load not found" })
    expect(getLoadMock).toHaveBeenCalledWith("carrier-1", "foreign-load")
    expect(addLoadEventMock).not.toHaveBeenCalled()
  })

  it("logs the check call once ownership is proven", async () => {
    getLoadMock.mockResolvedValue({ id: "load-1" } as never)
    const result = await logCheckCallAction("load-1", "  checked in  ")
    expect(result).toEqual({ ok: true })
    expect(addLoadEventMock).toHaveBeenCalledWith(
      "carrier-1", "load-1", "check_call", { note: "checked in" }, { id: "u1", name: "Dispatcher" }
    )
  })
})
