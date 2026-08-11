/**
 * The tick endpoint is the sandbox sim's only transport, and its contract is
 * the safety story (review E1/E3): the HUB_DEMO_LOGIN hard kill 403s before
 * any work, the sim.shift_mode flag is the redeploy-free soft kill, a
 * SANDBOX SESSION is required (ticks fire ~2×/min per tab and catch-up runs
 * hundreds of statements — never an unauthenticated cost lever), presence is
 * derived from the session (a request can never claim someone else's seat),
 * and busy/fresh tick results pass through as 200s so the browser ticker
 * treats them as routine, not failures.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/demo", () => ({ demoLoginEnabled: vi.fn() }))
vi.mock("@/lib/hub/flags", () => ({ getFlag: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/sandbox-sim", () => ({ tickSandboxSim: vi.fn() }))

import { demoLoginEnabled } from "@/lib/hub/demo"
import { getFlag } from "@/lib/hub/flags"
import { SANDBOX_CARRIER_ID, SANDBOX_SEATS } from "@/lib/hub/sandbox"
import { tickSandboxSim } from "@/lib/hub/sandbox-sim"
import { getHubUser } from "@/lib/hub/session"
import { POST } from "@/app/api/hub/sandbox/tick/route"

const mockEnabled = vi.mocked(demoLoginEnabled)
const mockFlag = vi.mocked(getFlag)
const mockUser = vi.mocked(getHubUser)
const mockTick = vi.mocked(tickSandboxSim)

const driverSeat = SANDBOX_SEATS.find((s) => s.key === "driver")!
const sandboxDriver = {
  id: "u1",
  name: driverSeat.name,
  email: driverSeat.email,
  role: "driver" as const,
  carrierId: SANDBOX_CARRIER_ID,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEnabled.mockReturnValue(true)
  mockFlag.mockResolvedValue(true)
  mockUser.mockResolvedValue(sandboxDriver)
  mockTick.mockResolvedValue({ advanced: true, ops: 3 })
})

describe("kill switches", () => {
  it("hard kill: demo logins off → 403 before the flag or sim are touched", async () => {
    mockEnabled.mockReturnValue(false)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ advanced: false, reason: "disabled" })
    expect(mockFlag).not.toHaveBeenCalled()
    expect(mockTick).not.toHaveBeenCalled()
  })

  it("soft kill: sim.shift_mode off → 403 with demo logins still on, sim untouched", async () => {
    mockFlag.mockResolvedValue(false)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ advanced: false, reason: "off" })
    expect(mockFlag).toHaveBeenCalledWith("sim.shift_mode", { carrierId: SANDBOX_CARRIER_ID })
    expect(mockTick).not.toHaveBeenCalled()
  })
})

describe("a sandbox session is required (E1)", () => {
  it("an anonymous heartbeat is refused — the tick is never an unauthenticated cost lever", async () => {
    mockUser.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ advanced: false, reason: "unauthorized" })
    expect(mockTick).not.toHaveBeenCalled()
  })

  it("a real-tenant session can never tick the sandbox — even with a colliding email", async () => {
    mockUser.mockResolvedValue({
      ...sandboxDriver,
      id: "u2",
      carrierId: "11111111-1111-1111-1111-111111111111",
    })
    const res = await POST()
    expect(res.status).toBe(401)
    expect(mockTick).not.toHaveBeenCalled()
  })
})

describe("presence comes from the session, not the request", () => {
  it("a sandbox seat login stamps its own seat key", async () => {
    await POST()
    expect(mockTick).toHaveBeenCalledWith("driver")
  })

  it("a sandbox session with no seat mapping ticks seatless", async () => {
    mockUser.mockResolvedValue({ ...sandboxDriver, email: "someone-else@demo.thind" })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mockTick).toHaveBeenCalledWith(null)
  })
})

describe("tick results pass through", () => {
  it("busy and fresh are 200s — routine outcomes, not errors", async () => {
    for (const reason of ["busy", "fresh"]) {
      mockTick.mockResolvedValue({ advanced: false, reason })
      const res = await POST()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ advanced: false, reason })
    }
  })
})
