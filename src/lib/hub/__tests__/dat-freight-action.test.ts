import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(),
}))

vi.mock("@/lib/hub/credentials", () => ({
  hasCredentials: vi.fn(),
}))

vi.mock("@/lib/hub/integrations/dat", () => ({
  datSource: vi.fn(),
  normalizeDatPosting: vi.fn((raw: Record<string, unknown>) => ({
    external_id: String(raw.matchId ?? ""),
    postedAt: "2026-06-01T12:00:00Z",
    equipment: "Van",
    originCity: "Kent",
    originState: "WA",
    destCity: "Boise",
    destState: "ID",
    miles: 420,
    rateTotalCents: 125000,
    pickupDate: "2026-06-02",
    contactPhone: null,
    raw,
  })),
  datPostingToLoadDraft: vi.fn(() => ({
    customer_reference: "MATCH-1",
    equipment: "dry_van",
    commodity: null,
    linehaul_cents: 125000,
    fuel_surcharge_cents: 0,
    accessorials: [],
    loaded_miles: 420,
    source: "dat",
    notes: null,
    stops: [
      { type: "pickup", city: "Kent", state: "WA", appt_start: "2026-06-02" },
      { type: "delivery", city: "Boise", state: "ID" },
    ],
  })),
}))

vi.mock("@/lib/hub/loads", () => ({
  createLoad: vi.fn(async () => ({
    id: "load-1",
    reference: "THD-1001",
    linehaul_cents: 125000,
  })),
}))

vi.mock("@/lib/hub/geocode", () => ({
  geocodeCityState: vi.fn(async () => ({ lat: 47.38, lng: -122.23 })),
}))

vi.mock("@/lib/hub/audit", () => ({
  logAudit: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { requirePermission } from "@/lib/hub/session"
import { hasCredentials } from "@/lib/hub/credentials"
import { datSource } from "@/lib/hub/integrations/dat"
import { createLoad } from "@/lib/hub/loads"
import { bookDatPostingAction, searchDatFreightAction } from "@/app/hub/_actions/dat-freight"

const requirePermissionMock = vi.mocked(requirePermission)
const hasCredentialsMock = vi.mocked(hasCredentials)
const datSourceMock = vi.mocked(datSource)
const createLoadMock = vi.mocked(createLoad)

const USER = {
  id: "user-1",
  name: "Dispatcher",
  carrierId: "carrier-1",
  role: "dispatcher" as const,
}

describe("searchDatFreightAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requirePermissionMock.mockResolvedValue(USER)
  })

  it("requires loads:read", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    await searchDatFreightAction({ originState: "WA" })
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:read")
  })

  it("returns a connect prompt when DAT credentials are missing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    const result = await searchDatFreightAction({ originState: "WA" })
    expect(result.ok).toBe(false)
    expect(result.connected).toBe(false)
    expect(result.error).toMatch(/isn't connected/i)
  })

  it("returns normalized postings when DAT is connected", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    datSourceMock.mockReturnValue({
      provider: "dat",
      connected: async () => true,
      pull: async () => [],
      search: async () => [
        {
          external_id: "A",
          postedAt: "2026-06-01T12:00:00Z",
          equipment: "Van",
          originCity: "Kent",
          originState: "WA",
          destCity: "Boise",
          destState: "ID",
          miles: 420,
          rateTotalCents: 125000,
          pickupDate: null,
          contactPhone: null,
          raw: { matchId: "A" },
        },
      ],
    })
    const result = await searchDatFreightAction({ originState: "WA" })
    expect(result.ok).toBe(true)
    expect(result.postings?.map((p) => p.external_id)).toEqual(["A"])
  })
})

describe("bookDatPostingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requirePermissionMock.mockResolvedValue(USER)
  })

  it("requires loads:write", async () => {
    await bookDatPostingAction("", { matchId: "A" })
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
  })

  it("refuses booking without a customer", async () => {
    const result = await bookDatPostingAction("", { matchId: "A" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/customer/i)
    expect(createLoadMock).not.toHaveBeenCalled()
  })

  it("creates a load with source dat from a posting", async () => {
    const result = await bookDatPostingAction("cust-1", { matchId: "MATCH-1" })
    expect(result.ok).toBe(true)
    expect(result.id).toBe("load-1")
    expect(createLoadMock).toHaveBeenCalledWith(
      "carrier-1",
      expect.objectContaining({
        customer_id: "cust-1",
        source: "dat",
        linehaul_cents: 125000,
      }),
      { id: "user-1", name: "Dispatcher" }
    )
  })
})
