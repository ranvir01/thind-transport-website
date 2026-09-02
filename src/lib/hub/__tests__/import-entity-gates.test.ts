/**
 * A CSV is a faster way to create rows, not a different permission.
 *
 * The setup imports (loads, trucks, drivers, customers) ran on `imports:run`
 * alone — a permission the accountant holds — so a seat the role matrix keeps
 * out of the Add-driver / Add-truck / New-load / New-customer forms could
 * create any number of each from a spreadsheet. Each import now also needs
 * the write its form needs. Fuel, tolls, positions and mileage stay on
 * `imports:run`: that IS the accountant's work.
 *
 * The role matrix is the real one (lib/hub/permissions); only the session and
 * the stores are mocked. Rows are empty so an allowed import returns before
 * touching a creator — what is under test is the gate, not the parser.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const session = vi.fn(async () => ({ id: "u-rosa", name: "Rosa Alvarez", carrierId: "carrier-1", role: "accountant" }))
vi.mock("@/lib/hub/session", () => ({ requirePermission: session }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []), hubDb: vi.fn() }))
vi.mock("@/lib/hub/settings", () => ({
  getCarrier: vi.fn(async () => null),
  getCarrierSettings: vi.fn(async () => ({ pay: { companyDriverPerMileCents: 64, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true } })),
}))
vi.mock("@/lib/hub/driver-invite", () => ({ sendDriverInviteEmail: vi.fn() }))
const createDriver = vi.fn()
const createTruck = vi.fn()
const createCustomer = vi.fn()
const createLoad = vi.fn()
vi.mock("@/lib/hub/drivers", () => ({ createDriver }))
vi.mock("@/lib/hub/fleet", () => ({ createTruck }))
vi.mock("@/lib/hub/customers", () => ({ createCustomer, findCustomerByName: vi.fn(async () => null) }))
vi.mock("@/lib/hub/loads", () => ({ createLoad }))

const as = (role: string, name = "Somebody") =>
  session.mockResolvedValueOnce({ id: `u-${role}`, name, carrierId: "carrier-1", role })

describe("setup imports need the write the form needs", () => {
  beforeEach(() => {
    createDriver.mockClear(); createTruck.mockClear(); createCustomer.mockClear(); createLoad.mockClear()
  })

  it.each([
    ["importDriversAction", "drivers"],
    ["importTrucksAction", "trucks"],
    ["importCustomersAction", "customers"],
  ])("%s refuses the accountant, who holds imports:run but not the write", async (action, what) => {
    as("accountant", "Rosa Alvarez")
    const mod = await import("../../../app/hub/_actions/import")
    const actions = mod as unknown as Record<string, (rows: unknown[]) => Promise<{ ok: boolean; failed: { error: string }[] }>>
    const result = await actions[action]([])
    expect(result.ok).toBe(false)
    expect(result.failed[0]?.error).toMatch(new RegExp(`can't create ${what}`))
  })

  it("importLoadsAction refuses the accountant too", async () => {
    as("accountant", "Rosa Alvarez")
    const { importLoadsAction } = await import("../../../app/hub/_actions/import")
    const result = await importLoadsAction([], { asHistory: true })
    expect(result.ok).toBe(false)
    expect(result.failed[0]?.error).toMatch(/can't create loads/)
  })

  it.each([
    ["importDriversAction"],
    ["importTrucksAction"],
    ["importCustomersAction"],
  ])("%s still runs for the dispatcher, who holds the write", async (action) => {
    as("dispatcher", "Marcus Webb")
    const mod = await import("../../../app/hub/_actions/import")
    const actions = mod as unknown as Record<string, (rows: unknown[]) => Promise<{ ok: boolean; imported: number }>>
    const result = await actions[action]([])
    expect(result.ok).toBe(true)
    expect(result.imported).toBe(0)
  })

  it("importLoadsAction still runs for the dispatcher", async () => {
    as("dispatcher", "Marcus Webb")
    const { importLoadsAction } = await import("../../../app/hub/_actions/import")
    const result = await importLoadsAction([], { asHistory: true })
    expect(result.ok).toBe(true)
  })

  it("leaves the accountant's own imports alone", async () => {
    // Fuel is `fuel:write`, which the accountant holds; the gate must not
    // have swept it up. Empty rows: the action returns before parsing.
    as("accountant", "Rosa Alvarez")
    const { importFuelAction } = await import("../../../app/hub/_actions/import")
    const result = await importFuelAction([], "EFS")
    expect(result.ok).toBe(true)
  })
})
