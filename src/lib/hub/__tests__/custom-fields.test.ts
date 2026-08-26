import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))

import { query, queryOne } from "@/lib/hub/db"
import {
  CUSTOM_FIELD_ENTITIES,
  ENTITY_META,
  coerceCustomValues,
  coerceFieldValue,
  parseFieldOptions,
  slugifyFieldKey,
} from "@/lib/hub/custom-fields"
import { getCustomValues, listCustomFields } from "@/lib/hub/custom-fields-db"

describe("slugifyFieldKey", () => {
  it("makes stable JSON-safe keys", () => {
    expect(slugifyFieldKey("Reefer temp (°F)")).toBe("reefer_temp_f")
    expect(slugifyFieldKey("  Customer Portal Code ")).toBe("customer_portal_code")
    expect(slugifyFieldKey("!!!")).toBe("")
    expect(slugifyFieldKey("a".repeat(80)).length).toBeLessThanOrEqual(48)
  })
})

describe("parseFieldOptions", () => {
  it("only select kinds carry options; lines are trimmed and deduped", () => {
    expect(parseFieldOptions("text", "a\nb")).toEqual([])
    expect(parseFieldOptions("select", " Continuous \n\nCycle-sentry\nContinuous\n")).toEqual([
      "Continuous",
      "Cycle-sentry",
    ])
  })
})

describe("coerceFieldValue", () => {
  it("validates per kind and rejects garbage instead of storing it", () => {
    expect(coerceFieldValue({ kind: "text", options: [] }, "  hello ")).toBe("hello")
    expect(coerceFieldValue({ kind: "number", options: [] }, "1,250.5")).toBe("1250.5")
    expect(coerceFieldValue({ kind: "number", options: [] }, "abc")).toBeNull()
    expect(coerceFieldValue({ kind: "date", options: [] }, "2026-08-09")).toBe("2026-08-09")
    expect(coerceFieldValue({ kind: "date", options: [] }, "08/09/2026")).toBeNull()
    expect(coerceFieldValue({ kind: "select", options: ["A", "B"] }, "B")).toBe("B")
    expect(coerceFieldValue({ kind: "select", options: ["A", "B"] }, "C")).toBeNull()
    expect(coerceFieldValue({ kind: "text", options: [] }, "   ")).toBeNull()
  })
})

describe("coerceCustomValues", () => {
  const defs = [
    { key: "temp", kind: "number" as const, options: [] },
    { key: "mode", kind: "select" as const, options: ["On", "Off"] },
  ]
  it("drops unknown keys and nulls cleared/invalid values", () => {
    const out = coerceCustomValues(defs, { temp: "-10", mode: "On", hack: "x", other: "y" })
    expect(out).toEqual({ temp: "-10", mode: "On" })
    expect(coerceCustomValues(defs, { temp: "", mode: "Nope" })).toEqual({ temp: null, mode: null })
  })
})

describe("tenancy", () => {
  beforeEach(() => {
    vi.mocked(query).mockClear()
    vi.mocked(queryOne).mockClear()
  })

  it("listCustomFields scopes to the carrier", async () => {
    await listCustomFields("carrier-1", "load")
    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(sql).toContain("carrier_id = $1")
    expect(params?.[0]).toBe("carrier-1")
  })

  it("getCustomValues reads only fixed hub tables, carrier-scoped", async () => {
    for (const entity of CUSTOM_FIELD_ENTITIES) {
      await getCustomValues("carrier-1", entity, "row-1")
    }
    for (const call of vi.mocked(queryOne).mock.calls) {
      const sql = String(call[0])
      expect(sql).toMatch(/FROM hub\.(loads|drivers|trucks|customers) /)
      expect(sql).toContain("carrier_id = $2")
      expect(call[1]).toEqual(["row-1", "carrier-1"])
    }
  })

  it("entity meta pins fixed table names and write permissions", () => {
    expect(ENTITY_META.load).toMatchObject({ table: "hub.loads", write: "loads:write" })
    expect(ENTITY_META.driver).toMatchObject({ table: "hub.drivers", write: "drivers:write" })
    expect(ENTITY_META.truck).toMatchObject({ table: "hub.trucks", write: "fleet:write" })
    expect(ENTITY_META.customer).toMatchObject({ table: "hub.customers", write: "customers:write" })
  })
})
