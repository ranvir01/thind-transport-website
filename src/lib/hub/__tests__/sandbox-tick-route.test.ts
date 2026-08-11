/**
 * The tick endpoint is the sandbox sim's only transport, and it is public by
 * design (same trust as the sandbox reset) — so its contract is the safety
 * story: the HUB_DEMO_LOGIN kill switch 403s before any work, presence is
 * derived from the SESSION (a request can never claim someone else's seat),
 * and busy/fresh tick results pass through as 200s so the browser ticker
 * treats them as routine, not failures.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/demo", () => ({ demoLoginEnabled: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/sandbox-sim", () => ({ tickSandboxSim: vi.fn() }))

import { demoLoginEnabled } from "@/lib/hub/demo"
import { SANDBOX_CARRIER_ID, SANDBOX_SEATS } from "@/lib/hub/sandbox"
import { tickSandboxSim } from "@/lib/hub/sandbox-sim"
import { getHubUser } from "@/lib/hub/session"
import { POST } from "@/app/api/hub/sandbox/tick/route"

const mockEnabled = vi.mocked(demoLoginEnabled)
const mockUser = vi.mocked(getHubUser)
const mockTick = vi.mocked(tickSandboxSim)

beforeEach(() => {
  vi.clearAllMocks()
  mockEnabled.mockReturnValue(true)
  mockUser.mockResolvedValue(null)
  mockTick.mockResolvedValue({ advanced: true, ops: 3 })
})

describe("kill switch", () => {
  it("403s without touching the sim when demo logins are off", async () => {
    mockEnabled.mockReturnValue(false)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ advanced: false, reason: "disabled" })
    expect(mockTick).not.toHaveBeenCalled()
  })
})

describe("presence comes from the session, not the request", () => {
  it("an anonymous heartbeat still ticks the world — with no seat", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ advanced: true })
    expect(mockTick).toHaveBeenCalledWith(null)
  })

  it("a sandbox seat login stamps its own seat key", async () => {
    const driverSeat = SANDBOX_SEATS.find((s) => s.key === "driver")!
    mockUser.mockResolvedValue({
      id: "u1",
      name: driverSeat.name,
      email: driverSeat.email,
      role: "driver",
      carrierId: SANDBOX_CARRIER_ID,
    })
    await POST()
    expect(mockTick).toHaveBeenCalledWith("driver")
  })

  it("a real-tenant session can never claim a sandbox seat", async () => {
    const driverSeat = SANDBOX_SEATS.find((s) => s.key === "driver")!
    mockUser.mockResolvedValue({
      id: "u2",
      name: "Real User",
      email: driverSeat.email, // even with a colliding email…
      role: "driver",
      carrierId: "11111111-1111-1111-1111-111111111111", // …the carrier gate wins
    })
    await POST()
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
