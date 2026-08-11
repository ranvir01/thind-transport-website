/**
 * Shift Mode's server actions carry three contracts an adversarial review
 * caught the code breaking:
 *
 *  1. Both kill switches are enforced HERE, not only on the tick route — a
 *     tab already open when the flag flips keeps a mounted ShiftCard polling,
 *     and `off: true` is the only thing that tells it to stand down.
 *  2. A transient DB failure is RETRYABLE (`ok:false` WITHOUT `off`), because
 *     the client's reaction to `off` is to discard a shift whose baseline
 *     exists nowhere else.
 *  3. A shift only counts as completed when it ends in the world it began
 *     in — otherwise a mid-shift reset scores a voided shift against the new
 *     world's counters.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/demo", () => ({ demoLoginEnabled: vi.fn() }))
vi.mock("@/lib/hub/flags", () => ({ getFlag: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/sandbox-shift", () => ({
  readSimEpoch: vi.fn(),
  readShiftMetrics: vi.fn(),
  bumpShiftCounter: vi.fn(),
}))

import { demoLoginEnabled } from "@/lib/hub/demo"
import { getFlag } from "@/lib/hub/flags"
import { SANDBOX_CARRIER_ID, SANDBOX_SEATS } from "@/lib/hub/sandbox"
import { bumpShiftCounter, readShiftMetrics, readSimEpoch } from "@/lib/hub/sandbox-shift"
import { getHubUser } from "@/lib/hub/session"
import { endShiftAction, shiftStatusAction, startShiftAction } from "@/app/hub/_actions/sandbox-shift"

const mockEnabled = vi.mocked(demoLoginEnabled)
const mockFlag = vi.mocked(getFlag)
const mockUser = vi.mocked(getHubUser)
const mockEpoch = vi.mocked(readSimEpoch)
const mockMetrics = vi.mocked(readShiftMetrics)
const mockBump = vi.mocked(bumpShiftCounter)

const dispatcher = SANDBOX_SEATS.find((s) => s.key === "dispatcher")!
const METRICS = {
  at: "2026-01-15T18:00:00.000Z",
  myBookings: 1, myDispatches: 1, quotedCount: 7, myStatusMoves: 1, myPodsSubmitted: 0,
  myArrivals: 0, myOnTimeArrivals: 0, myInvoices: 0, myInvoicedCents: 0,
  paymentsRecorded: 0, unbilledCount: 3,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEnabled.mockReturnValue(true)
  mockFlag.mockResolvedValue(true)
  mockUser.mockResolvedValue({
    id: "u1", name: dispatcher.name, email: dispatcher.email,
    role: "dispatcher", carrierId: SANDBOX_CARRIER_ID,
  })
  mockEpoch.mockResolvedValue("epoch-1")
  mockMetrics.mockResolvedValue(METRICS)
  mockBump.mockResolvedValue(undefined)
})

describe("kill switches reach the actions, not just the tick route", () => {
  it("demo logins off → off:true so a stale card stands down", async () => {
    mockEnabled.mockReturnValue(false)
    expect(await shiftStatusAction()).toMatchObject({ ok: false, off: true })
  })

  it("sim.shift_mode off → off:true, scoped to the sandbox tenant", async () => {
    mockFlag.mockResolvedValue(false)
    expect(await shiftStatusAction()).toMatchObject({ ok: false, off: true })
    expect(mockFlag).toHaveBeenCalledWith("sim.shift_mode", { carrierId: SANDBOX_CARRIER_ID })
  })

  it("a non-sandbox session and a non-shift seat both stand down", async () => {
    mockUser.mockResolvedValue({
      id: "u2", name: "Real", email: dispatcher.email,
      role: "dispatcher", carrierId: "11111111-1111-1111-1111-111111111111",
    })
    expect(await shiftStatusAction()).toMatchObject({ ok: false, off: true })

    const owner = SANDBOX_SEATS.find((s) => s.key === "owner")!
    mockUser.mockResolvedValue({
      id: "u3", name: owner.name, email: owner.email, role: "owner", carrierId: SANDBOX_CARRIER_ID,
    })
    expect(await shiftStatusAction()).toMatchObject({ ok: false, off: true })
  })
})

describe("transient failures stay retryable", () => {
  it("a DB error is ok:false but NOT off — the client keeps its baseline", async () => {
    mockMetrics.mockRejectedValue(new Error("connection terminated"))
    const res = await shiftStatusAction()
    expect(res.ok).toBe(false)
    expect(res.off).toBeUndefined()
    expect(res.error).toMatch(/try again/i)
  })
})

describe("telemetry counts real shifts only", () => {
  it("clocking in counts a started shift for that seat", async () => {
    const res = await startShiftAction()
    expect(res).toMatchObject({ ok: true, seat: "dispatcher", epoch: "epoch-1" })
    expect(mockBump).toHaveBeenCalledWith("shiftsStarted", "dispatcher")
  })

  it("ending in the same world counts a completed shift", async () => {
    await endShiftAction("epoch-1")
    expect(mockBump).toHaveBeenCalledWith("shiftsCompleted", "dispatcher")
  })

  it("ending after a reset does NOT count — that shift is void", async () => {
    mockEpoch.mockResolvedValue("epoch-2") // the sandbox was reset mid-shift
    const res = await endShiftAction("epoch-1")
    expect(res.epoch).toBe("epoch-2")
    expect(mockBump).not.toHaveBeenCalled()
  })

  it("a failed read never counts a completion", async () => {
    mockMetrics.mockRejectedValue(new Error("nope"))
    await endShiftAction("epoch-1")
    expect(mockBump).not.toHaveBeenCalled()
  })
})
