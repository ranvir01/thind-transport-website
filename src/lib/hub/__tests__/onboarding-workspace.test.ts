/**
 * createWorkspaceAction (src/app/hub/_actions/onboarding.ts) — the wizard's
 * final step. Pins: input validation short-circuits before any DB work,
 * duplicate emails are rejected, the wizard's optional brand accent is seeded
 * into carrier_settings only when it's a well-formed hex color (a malformed
 * accent is dropped silently — cosmetic fields never block signup), the pay
 * step's rates are seeded when sane and REJECTED when nonsense (pay is money:
 * silently substituting a default for a mistyped rate would corrupt every
 * settlement until someone noticed), the accessorial price book is seeded
 * with the industry-typical defaults inside the same transaction (migration
 * 003 only seeds the original Thind carrier, so without this every self-serve
 * tenant would start with an empty "Add accessorial" list), and a failed
 * insert rolls the transaction back instead of committing half a tenant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  hubDb: vi.fn(),
  queryOne: vi.fn(async () => null),
  query: vi.fn(async () => []),
}))
vi.mock("../session", () => ({ getHubUser: vi.fn(), requireOwner: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async () => "hashed") } }))

import { hubDb, queryOne } from "../db"
import { createWorkspaceAction } from "@/app/hub/_actions/onboarding"

const hubDbMock = vi.mocked(hubDb)
const queryOneMock = vi.mocked(queryOne)

const VALID_INPUT = {
  companyName: "Cascade Lines LLC",
  ownerName: "Ranvir Thind",
  email: "Owner@Cascade.example",
  password: "long-enough-pw",
}

function mockClient() {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("INSERT INTO hub.carriers")) return { rows: [{ id: "carrier-1" }] }
    return { rows: [] }
  })
  const client = { query, release: vi.fn() }
  hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) } as never)
  return client
}

/** The settings JSON handed to the carrier_settings INSERT. */
function seededSettings(client: ReturnType<typeof mockClient>) {
  const call = client.query.mock.calls.find(([sql]) => String(sql).includes("carrier_settings"))
  expect(call).toBeDefined()
  return JSON.parse((call![1] as string[])[1])
}

beforeEach(() => {
  vi.clearAllMocks()
  queryOneMock.mockResolvedValue(null)
})

describe("createWorkspaceAction", () => {
  it("rejects bad input before touching the database", async () => {
    mockClient()
    for (const bad of [
      { ...VALID_INPUT, companyName: "  " },
      { ...VALID_INPUT, ownerName: "" },
      { ...VALID_INPUT, email: "not-an-email" },
      { ...VALID_INPUT, password: "short" },
    ]) {
      const result = await createWorkspaceAction(bad)
      expect(result.ok).toBe(false)
    }
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("rejects an email that already has an account", async () => {
    const client = mockClient()
    queryOneMock.mockResolvedValue({ id: "existing-user" } as never)

    const result = await createWorkspaceAction(VALID_INPUT)

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign in/i)
    expect(client.query).not.toHaveBeenCalled()
  })

  it("creates carrier, settings, and owner in one transaction", async () => {
    const client = mockClient()

    const result = await createWorkspaceAction(VALID_INPUT)

    expect(result.ok).toBe(true)
    const statements = client.query.mock.calls.map(([sql]) => String(sql))
    expect(statements[0]).toBe("BEGIN")
    expect(statements.at(-1)).toBe("COMMIT")
    expect(statements.some((s) => s.includes("INSERT INTO hub.users"))).toBe(true)
    const settings = seededSettings(client)
    expect(settings.invoice.prefix).toBe("CAS-INV-")
    expect(settings.notifications.officeEmail).toBe("owner@cascade.example")
  })

  it("seeds branding.accent when the wizard passes a valid hex color", async () => {
    const client = mockClient()

    const result = await createWorkspaceAction({ ...VALID_INPUT, accent: "#2563eb" })

    expect(result.ok).toBe(true)
    expect(seededSettings(client).branding).toEqual({ accent: "#2563eb" })
  })

  it("drops a malformed accent silently — cosmetics never block signup", async () => {
    for (const accent of ["2563eb", "#25f", "#25f63g1", "blue", "#2563eb; DROP"]) {
      const client = mockClient()
      const result = await createWorkspaceAction({ ...VALID_INPUT, accent })
      expect(result.ok).toBe(true)
      expect(seededSettings(client).branding).toBeUndefined()
    }
  })

  it("omits the branding key entirely when no accent was picked", async () => {
    const client = mockClient()

    await createWorkspaceAction(VALID_INPUT)

    expect(seededSettings(client).branding).toBeUndefined()
  })

  it("seeds the pay step's rates when provided", async () => {
    const client = mockClient()

    const result = await createWorkspaceAction({ ...VALID_INPUT, payPerMile: 0.72, ownerOperatorPct: 88 })

    expect(result.ok).toBe(true)
    const pay = seededSettings(client).pay
    expect(pay.companyDriverPerMile).toBe(0.72)
    expect(pay.ownerOperatorPercentage).toBe(0.88)
    expect(pay.payLoadedMilesOnly).toBe(true)
  })

  it("keeps the platform pay defaults when the wizard omits the pay step", async () => {
    const client = mockClient()

    await createWorkspaceAction(VALID_INPUT)

    const pay = seededSettings(client).pay
    expect(pay.companyDriverPerMile).toBe(0.6)
    expect(pay.ownerOperatorPercentage).toBe(0.9)
  })

  it("rounds pay input to sane precision (cents per mile, basis points of share)", async () => {
    const client = mockClient()

    await createWorkspaceAction({ ...VALID_INPUT, payPerMile: 0.6849, ownerOperatorPct: 87.5 })

    const pay = seededSettings(client).pay
    expect(pay.companyDriverPerMile).toBe(0.68)
    expect(pay.ownerOperatorPercentage).toBe(0.875)
  })

  it("rejects nonsense pay values before touching the database — never silently defaults money", async () => {
    mockClient()
    for (const bad of [
      { ...VALID_INPUT, payPerMile: 0 },
      { ...VALID_INPUT, payPerMile: -0.5 },
      { ...VALID_INPUT, payPerMile: 5.01 },
      { ...VALID_INPUT, payPerMile: Number.NaN },
      { ...VALID_INPUT, ownerOperatorPct: 0 },
      { ...VALID_INPUT, ownerOperatorPct: 101 },
      { ...VALID_INPUT, ownerOperatorPct: Number.NaN },
    ]) {
      const result = await createWorkspaceAction(bad)
      expect(result.ok).toBe(false)
      expect(result.error).toBeTruthy()
    }
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("seeds the default accessorial price book inside the signup transaction", async () => {
    const client = mockClient()

    const result = await createWorkspaceAction(VALID_INPUT)

    expect(result.ok).toBe(true)
    const priceBookCalls = client.query.mock.calls.filter(([sql]) =>
      String(sql).includes("hub.accessorial_types")
    )
    const seeded = priceBookCalls.map(([, params]) => {
      const [carrierId, name, amountCents, unit] = params as [string, string, number, string]
      expect(carrierId).toBe("carrier-1")
      return { name, amountCents, unit }
    })
    expect(seeded).toEqual([
      { name: "Detention", amountCents: 6000, unit: "per_hour" },
      { name: "Layover", amountCents: 25000, unit: "per_day" },
      { name: "TONU", amountCents: 20000, unit: "flat" },
      { name: "Stop-off", amountCents: 10000, unit: "flat" },
      { name: "Tarp", amountCents: 10000, unit: "flat" },
      { name: "Lumper", amountCents: 0, unit: "pass_through" },
    ])
    // Inside the transaction: seeding must come after BEGIN and before COMMIT,
    // so a failed seed never commits half a tenant.
    const statements = client.query.mock.calls.map(([sql]) => String(sql))
    const firstSeed = statements.findIndex((s) => s.includes("hub.accessorial_types"))
    expect(firstSeed).toBeGreaterThan(statements.indexOf("BEGIN"))
    expect(firstSeed).toBeLessThan(statements.indexOf("COMMIT"))
  })

  it("seeds the price-book Detention rate equal to the settings detention accrual rate", async () => {
    const client = mockClient()

    await createWorkspaceAction(VALID_INPUT)

    const detentionRow = client.query.mock.calls.find(
      ([sql, params]) =>
        String(sql).includes("hub.accessorial_types") && (params as string[])[1] === "Detention"
    )
    expect(detentionRow).toBeDefined()
    const seededCents = (detentionRow![1] as [string, string, number, string])[2]
    expect(seededSettings(client).detention.ratePerHourCents).toBe(seededCents)
  })

  it("rolls back and reports failure when an insert throws", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO hub.carriers")) throw new Error("boom")
      return { rows: [] }
    })
    const client = { query, release: vi.fn() }
    hubDbMock.mockReturnValue({ connect: vi.fn(async () => client) } as never)

    const result = await createWorkspaceAction(VALID_INPUT)

    expect(result.ok).toBe(false)
    expect(query.mock.calls.map(([sql]) => String(sql))).toContain("ROLLBACK")
    expect(client.release).toHaveBeenCalled()
  })
})
