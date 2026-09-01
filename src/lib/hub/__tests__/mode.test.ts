/**
 * Simulation mode: fail-closed for outbound side effects, fail-open for
 * live-integration unit tests until the platform_state row is explicit.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { queryOne } from "../db"
import {
  carrierIdFromSimView,
  isSimTenantId,
  isSimulation,
  liveIntegrationsAllowed,
  SIM_WATERMARK,
  ATS_CARRIER_ID,
  THIND_CARRIER_ID,
} from "../mode"

const queryOneMock = vi.mocked(queryOne)
const ORIGINAL = process.env.HAULDESK_MODE

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HAULDESK_MODE
  else process.env.HAULDESK_MODE = ORIGINAL
  queryOneMock.mockReset().mockResolvedValue(null)
})

describe("isSimulation", () => {
  it("env=simulation wins over a legit database row", async () => {
    process.env.HAULDESK_MODE = "simulation"
    queryOneMock.mockResolvedValue({ mode: "legit", sim_seed: null, sim_clock_date: null, generated_at: null })
    expect(await isSimulation()).toBe(true)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("env=legit wins over a simulation database row", async () => {
    process.env.HAULDESK_MODE = "legit"
    queryOneMock.mockResolvedValue({ mode: "simulation", sim_seed: "x", sim_clock_date: null, generated_at: null })
    expect(await isSimulation()).toBe(false)
  })

  it("fail-closed: missing row is simulation", async () => {
    delete process.env.HAULDESK_MODE
    queryOneMock.mockResolvedValue(null)
    expect(await isSimulation()).toBe(true)
  })

  it("reads the singleton row when env is unset", async () => {
    delete process.env.HAULDESK_MODE
    queryOneMock.mockResolvedValue({ mode: "legit", sim_seed: null, sim_clock_date: null, generated_at: null })
    expect(await isSimulation()).toBe(false)
  })
})

describe("liveIntegrationsAllowed", () => {
  it("is false in simulation even if credentials exist", async () => {
    process.env.HAULDESK_MODE = "simulation"
    expect(await liveIntegrationsAllowed()).toBe(false)
  })

  it("fail-open when the table is missing so adapter tests keep working", async () => {
    delete process.env.HAULDESK_MODE
    queryOneMock.mockResolvedValue(null)
    expect(await liveIntegrationsAllowed()).toBe(true)
  })
})

describe("sim tenants", () => {
  it("maps the switcher onto the two seeded UUIDs", () => {
    expect(isSimTenantId(THIND_CARRIER_ID)).toBe(true)
    expect(isSimTenantId(ATS_CARRIER_ID)).toBe(true)
    expect(isSimTenantId("33333333-3333-3333-3333-333333333333")).toBe(false)
    expect(carrierIdFromSimView("ats", THIND_CARRIER_ID)).toBe(ATS_CARRIER_ID)
    expect(carrierIdFromSimView("thind", ATS_CARRIER_ID)).toBe(THIND_CARRIER_ID)
    expect(carrierIdFromSimView("all", THIND_CARRIER_ID)).toBe("all")
  })

  it("stamps PDFs with a sentence nobody can file", () => {
    expect(SIM_WATERMARK).toBe("SIMULATION — NOT A REAL DOCUMENT")
  })
})
