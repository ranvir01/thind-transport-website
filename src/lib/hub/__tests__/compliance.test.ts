import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { complianceEntries } from "../compliance"

const queryMock = vi.mocked(query)
const CARRIER = "11111111-1111-1111-1111-111111111111"

describe("complianceEntries", () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
  })

  it("surfaces trailer registration and inspection expiries, same as trucks", async () => {
    queryMock.mockImplementation(async (sql: unknown) => {
      if (String(sql).includes("hub.trailers")) {
        return [{ id: "trailer-1", unit_number: "501", registration_expiry: "2020-01-01", inspection_due: "2020-06-01" }]
      }
      return []
    })
    const entries = await complianceEntries(CARRIER)
    const trailerEntries = entries.filter((e) => e.entity === "trailer")

    expect(trailerEntries).toHaveLength(2)
    expect(trailerEntries.map((e) => e.kind).sort()).toEqual(["Annual inspection (396.17)", "Registration"])
    expect(trailerEntries.every((e) => e.name === "Trailer #501")).toBe(true)
    expect(trailerEntries.every((e) => e.href === "/hub/fleet/trailers/trailer-1")).toBe(true)
    // Both dates are long past — the compliance wall should flag them expired (red), not silently drop them.
    expect(trailerEntries.every((e) => e.color === "red")).toBe(true)
  })

  it("scopes the trailer query by carrier, excludes retired and soft-deleted rows", async () => {
    await complianceEntries(CARRIER)
    const trailerCall = queryMock.mock.calls.find(([sql]) => String(sql).includes("hub.trailers"))
    expect(trailerCall).toBeDefined()
    const [sql, params] = trailerCall!
    expect(sql).toContain("carrier_id = $1")
    expect(sql).toContain("deleted_at IS NULL")
    expect(sql).toContain("status <> 'retired'")
    expect(params).toEqual([CARRIER])
  })

  it("returns no trailer entries when the fleet has none", async () => {
    const entries = await complianceEntries(CARRIER)
    expect(entries.filter((e) => e.entity === "trailer")).toHaveLength(0)
  })
})
