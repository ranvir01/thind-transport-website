/**
 * Truck subsystem audit (168446e4's carried-forward finding): submitDvir's
 * 396.13(c) release branch only checked `input.type === "pre" &&
 * prior?.repair_certified_at` — not whether THIS pre-trip itself found a new
 * unsafe defect. DvirForm lets a driver mark any DVIR (pre or post) unsafe,
 * so a driver reviewing a repair-certified truck who found a fresh defect and
 * answered "No — park it" still had the truck released to 'active', and the
 * grounding branch (work order + owner alert) never fired because it was
 * hardcoded to type === "post". Both are fixed: grounding is defect+unsafe
 * driven regardless of trip type; release requires the reviewing pre-trip
 * itself to be clean.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  hubDb: vi.fn(),
}))

import { hubDb } from "../db"
import { submitDvir } from "../dvir"

const hubDbMock = vi.mocked(hubDb)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const TRUCK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const PRIOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

function mockClient(priorRow: { repair_certified_at: string | null } | null) {
  const calls: { sql: string; params: unknown[] }[] = []
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })
      if (/SELECT repair_certified_at FROM hub\.dvirs/.test(sql)) {
        return { rows: priorRow ? [priorRow] : [] }
      }
      if (/INSERT INTO hub\.dvirs/.test(sql)) return { rows: [{ id: "dvir-new" }] }
      if (/INSERT INTO hub\.maintenance_records/.test(sql)) return { rows: [{ id: "wo-1" }] }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  hubDbMock.mockReturnValue({ connect: async () => client } as never)
  return { client, calls }
}

const BASE_INPUT = {
  truckId: TRUCK,
  driverId: "driver-1",
  checklist: [],
  signature: "data:image/png;base64,sig",
  signedName: "Test Driver",
}

beforeEach(() => {
  hubDbMock.mockReset()
})

describe("submitDvir grounding is defect/safety driven, not trip-type driven", () => {
  it("does NOT release a certified truck when the reviewing pre-trip itself finds a new unsafe defect", async () => {
    const { calls } = mockClient({ repair_certified_at: "2026-07-01T00:00:00Z" })
    const result = await submitDvir(CARRIER, {
      ...BASE_INPUT,
      type: "pre",
      priorDvirId: PRIOR,
      defects: [{ label: "Steering" }],
      safeToOperate: false,
    })

    expect(result.grounded).toBe(true)
    expect(calls.some((c) => /SET status = 'active'/.test(c.sql))).toBe(false)
    const groundedUpdate = calls.find((c) => /SET status = 'shop'/.test(c.sql))
    expect(groundedUpdate).toBeDefined()
    expect(calls.some((c) => /INSERT INTO hub\.maintenance_records/.test(c.sql))).toBe(true)
  })

  it("still releases a certified truck when the reviewing pre-trip is clean", async () => {
    const { calls } = mockClient({ repair_certified_at: "2026-07-01T00:00:00Z" })
    const result = await submitDvir(CARRIER, {
      ...BASE_INPUT,
      type: "pre",
      priorDvirId: PRIOR,
      defects: [],
      safeToOperate: true,
    })

    expect(result.grounded).toBe(false)
    expect(calls.some((c) => /SET status = 'active'/.test(c.sql))).toBe(true)
  })

  it("grounds the truck on a plain pre-trip (no prior DVIR) that finds an unsafe defect", async () => {
    const { calls } = mockClient(null)
    const result = await submitDvir(CARRIER, {
      ...BASE_INPUT,
      type: "pre",
      priorDvirId: null,
      defects: [{ label: "Brakes" }],
      safeToOperate: false,
    })

    expect(result.grounded).toBe(true)
    expect(calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(true)
    expect(calls.some((c) => /INSERT INTO hub\.maintenance_records/.test(c.sql))).toBe(true)
  })

  it("still grounds on an unsafe post-trip (unchanged behavior)", async () => {
    const { calls } = mockClient(null)
    const result = await submitDvir(CARRIER, {
      ...BASE_INPUT,
      type: "post",
      priorDvirId: null,
      defects: [{ label: "Lights" }],
      safeToOperate: false,
    })

    expect(result.grounded).toBe(true)
    expect(calls.some((c) => /SET status = 'shop'/.test(c.sql))).toBe(true)
  })
})
