/**
 * Three server actions that checked you were SOMEBODY and not that you were
 * allowed — the shape a ten-lens audit of the app kept finding.
 *
 *  1. A driver's first incident report accepted any load id in the carrier,
 *     so a report could be pinned to freight another driver was hauling and
 *     the safety register would blame the wrong truck.
 *  2. Accepting an intake draft took the load id straight from the client and
 *     re-parented the emailed rate con onto it with no carrier check, so a
 *     foreign id made the document vanish from every carrier-scoped list.
 *  3. Creating an office user accepted every HubRole the schema knows, so an
 *     owner could mint a second owner, or a driver/broker/shipper login with
 *     no driver or customer behind it that nothing could ever reach.
 *
 * Sessions and stores are mocked; what is under test is the guard, and the
 * assertion that matters is the negative one — the write must not happen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/notify", () => ({ notifyRoles: vi.fn(async () => undefined), notifyUser: vi.fn(async () => undefined) }))

const driverUser = { id: "u-jordan", name: "Jordan Reyes", carrierId: "carrier-1", driverId: "d-jordan", role: "driver" }
const ownerUser = { id: "u-priya", name: "Priya Dhillon", carrierId: "carrier-1", role: "owner" }
vi.mock("@/lib/hub/session", () => ({
  requireDriverUser: vi.fn(async () => driverUser),
  requirePermission: vi.fn(async () => ownerUser),
  requireOfficeUser: vi.fn(async () => ownerUser),
}))

// ---- 1 · incident report ----
const createIncident = vi.fn(async () => ({ id: "inc-1" }))
vi.mock("@/lib/hub/incidents", () => ({ createIncident, updateIncident: vi.fn() }))
vi.mock("@/lib/hub/claims", () => ({ createClaim: vi.fn(), updateClaim: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({
  queryOne: vi.fn(async () => null),
  query: vi.fn(async () => []),
}))
const driverOwnsLoad = vi.fn(async (_c: string, _d: string, loadId: string) =>
  loadId === "L-mine" ? { id: "L-mine", status: "in_transit" } : null
)
vi.mock("@/lib/hub/driver-app", () => ({ driverOwnsLoad }))

// ---- 2 · intake accept ----
const resolveIntakeDraft = vi.fn(async () => true)
vi.mock("@/lib/hub/intake-drafts", () => ({
  getIntakeDraft: vi.fn(async () => ({ id: "draft-1", document_id: "doc-1", source: "email", confidence: 0.9 })),
  resolveIntakeDraft,
}))
const assertCarrierRefs = vi.fn(async (_c: string, refs: Record<string, string | null | undefined>) => {
  if (refs.load_id === "L-foreign") throw new Error("Load not found")
})
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs }))

// ---- 3 · office user ----
/** Every call, captured whole — the assertions read the payload, not the mock's arity. */
const hubUserCalls: unknown[][] = []
const createHubUser = vi.fn(async (...args: unknown[]) => {
  hubUserCalls.push(args)
  return { id: "u-new", email: "new@blueridge.test", role: String((args[1] as { role?: string })?.role) }
})
vi.mock("@/lib/hub/users", () => ({ createHubUser, setHubUserActive: vi.fn() }))
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async () => "hashed") } }))
vi.mock("@/lib/hub/drivers", () => ({ createDriver: vi.fn(), updateDriver: vi.fn(), getDriver: vi.fn() }))
vi.mock("@/lib/hub/customers", () => ({
  createCustomer: vi.fn(), updateCustomer: vi.fn(), createContact: vi.fn(), deleteContact: vi.fn(), addCrmActivity: vi.fn(),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrier: vi.fn(async () => null) }))
vi.mock("@/lib/hub/driver-invite", () => ({ hasDriverAppAccount: vi.fn(), sendDriverInviteEmail: vi.fn() }))

const REPORT = {
  occurredAt: "2026-08-14T10:00:00Z",
  location: "I-90 MP 112",
  description: "Rear-ended at a light",
  fatality: false,
  injuryTreatedAway: false,
  towAwayDisabling: false,
}

describe("a driver's first report stays on the driver's own freight", () => {
  beforeEach(() => createIncident.mockClear())

  it("refuses another driver's load, and files nothing", async () => {
    const { fileDriverIncidentReport } = await import("../../../app/hub/_actions/safety")
    const result = await fileDriverIncidentReport({ ...REPORT, loadId: "L-other" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/yours/i)
    expect(createIncident).not.toHaveBeenCalled()
  })

  it("accepts the driver's own load", async () => {
    const { fileDriverIncidentReport } = await import("../../../app/hub/_actions/safety")
    const result = await fileDriverIncidentReport({ ...REPORT, loadId: "L-mine" })
    expect(result.ok).toBe(true)
    expect(createIncident).toHaveBeenCalledTimes(1)
  })

  it("still files a report with no load on it", async () => {
    const { fileDriverIncidentReport } = await import("../../../app/hub/_actions/safety")
    const result = await fileDriverIncidentReport(REPORT)
    expect(result.ok).toBe(true)
  })
})

describe("accepting an intake draft checks the load is the carrier's", () => {
  beforeEach(() => resolveIntakeDraft.mockClear())

  it("refuses a foreign load id before resolving or re-parenting anything", async () => {
    const { acceptIntakeDraftAction } = await import("../../../app/hub/_actions/intake")
    const result = await acceptIntakeDraftAction("draft-1", "L-foreign")
    expect(result.ok).toBe(false)
    expect(resolveIntakeDraft).not.toHaveBeenCalled()
    const { query } = await import("@/lib/hub/db")
    expect(query).not.toHaveBeenCalled()
  })

  it("files the draft against the carrier's own load", async () => {
    const { acceptIntakeDraftAction } = await import("../../../app/hub/_actions/intake")
    const result = await acceptIntakeDraftAction("draft-1", "L-mine")
    expect(result.ok).toBe(true)
    expect(assertCarrierRefs).toHaveBeenCalledWith("carrier-1", { load_id: "L-mine" })
    expect(resolveIntakeDraft).toHaveBeenCalledTimes(1)
  })
})

describe("office logins are dispatcher or accountant, full stop", () => {
  beforeEach(() => { hubUserCalls.length = 0 })

  const values = (role: string) => ({
    email: "new@blueridge.test", name: "New Person", role, password: "longenough1",
  })

  it.each(["owner", "driver", "broker", "shipper"])("refuses to mint a %s login here", async (role) => {
    const { createHubUserAction } = await import("../../../app/hub/_actions/people")
    const result = await createHubUserAction(values(role))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/dispatcher or accountant/)
    expect(hubUserCalls).toEqual([])
  })

  it.each(["dispatcher", "accountant"])("creates a %s", async (role) => {
    const { createHubUserAction } = await import("../../../app/hub/_actions/people")
    const result = await createHubUserAction(values(role))
    expect(result.ok).toBe(true)
    expect(hubUserCalls).toHaveLength(1)
    expect(hubUserCalls[0][0]).toBe("carrier-1")
    expect(hubUserCalls[0][1]).toMatchObject({ email: "new@blueridge.test", role })
  })
})
