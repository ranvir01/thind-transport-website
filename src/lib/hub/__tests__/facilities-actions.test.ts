import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ requirePermission: vi.fn(async () => ({ carrierId: "carrier-1" })) }))
vi.mock("@/lib/hub/facilities", () => ({
  addFacilityNote: vi.fn(),
  detentionRisk: vi.fn(),
  formatDwell: vi.fn(),
  updateFacilityInfo: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/settings", () => ({ getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({ queryOne: vi.fn() }))

import { updateFacilityAction } from "@/app/hub/_actions/facilities"
import { updateFacilityInfo } from "@/lib/hub/facilities"

const updateMock = vi.mocked(updateFacilityInfo)

describe("updateFacilityAction — typical lumper money parsing", () => {
  beforeEach(() => {
    updateMock.mockClear()
  })

  it("stores a genuinely free ($0.00) lumper fee as 0 cents, not null", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "0.00" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: 0 })
    )
  })

  it("parses a normal dollar amount to integer cents via the canonical parser", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "125.50" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: 12550 })
    )
  })

  it("clears the field to null when left blank", async () => {
    await updateFacilityAction("facility-1", { typicalLumper: "" })
    expect(updateMock).toHaveBeenCalledWith(
      "carrier-1",
      "facility-1",
      expect.objectContaining({ typicalLumperCents: null })
    )
  })
})
