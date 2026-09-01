/**
 * The compliance wall's ?entity=&color= filtering (summary tiles + entity
 * chips) is pure URL → subset logic; these pin the parse allowlist, the
 * facet composition, and the href round-trip so a mistyped URL can never
 * hide rows or crash the page.
 */
import { describe, expect, it } from "vitest"

import type { ComplianceEntry } from "@/lib/hub/compliance"
import {
  WALL_ENTITIES,
  entityCounts,
  filterWall,
  parseWallFilter,
  wallHref,
} from "@/app/hub/(office)/compliance/wall-filter"

function entry(overrides: Partial<ComplianceEntry>): ComplianceEntry {
  return {
    entity: "driver",
    entityId: "d1",
    name: "Test Driver",
    kind: "CDL",
    due: "2026-01-01",
    color: "green",
    href: "/hub/drivers/d1",
    ...overrides,
  }
}

const WALL: ComplianceEntry[] = [
  entry({ entity: "driver", color: "red", kind: "CDL" }),
  entry({ entity: "driver", color: "green", kind: "Medical card" }),
  entry({ entity: "truck", color: "red", kind: "Registration" }),
  entry({ entity: "truck", color: "amber", kind: "Insurance" }),
  entry({ entity: "trailer", color: "green", kind: "Registration" }),
  entry({ entity: "company", color: "amber", kind: "IFTA filing" }),
]

describe("parseWallFilter", () => {
  it("accepts every entity the chips can emit, plus the three colors", () => {
    for (const e of WALL_ENTITIES) {
      expect(parseWallFilter({ entity: e }).entity).toBe(e)
    }
    for (const c of ["red", "amber", "green"] as const) {
      expect(parseWallFilter({ color: c }).color).toBe(c)
    }
  })

  it("treats unknown, wrong-case, or missing values as unfiltered", () => {
    expect(parseWallFilter({})).toEqual({ entity: null, color: null })
    expect(parseWallFilter({ entity: "DRIVER", color: "purple" })).toEqual({ entity: null, color: null })
    expect(parseWallFilter({ entity: "drivers" })).toEqual({ entity: null, color: null })
  })
})

describe("filterWall", () => {
  it("returns the full wall when nothing is filtered", () => {
    expect(filterWall(WALL, { entity: null, color: null })).toEqual(WALL)
  })

  it("filters by a single facet", () => {
    expect(filterWall(WALL, { entity: "truck", color: null }).map((e) => e.kind)).toEqual([
      "Registration",
      "Insurance",
    ])
    expect(filterWall(WALL, { entity: null, color: "red" })).toHaveLength(2)
  })

  it("composes both facets with AND", () => {
    const both = filterWall(WALL, { entity: "truck", color: "red" })
    expect(both).toHaveLength(1)
    expect(both[0]!.kind).toBe("Registration")
  })

  it("can come up empty without throwing", () => {
    expect(filterWall(WALL, { entity: "trailer", color: "red" })).toEqual([])
  })
})

describe("wallHref", () => {
  it("keeps the clean URL clean and round-trips through parseWallFilter", () => {
    expect(wallHref({ entity: null, color: null })).toBe("/hub/compliance")
    const href = wallHref({ entity: "driver", color: "red" })
    expect(href).toBe("/hub/compliance?entity=driver&color=red")
    const qs = Object.fromEntries(new URLSearchParams(href.split("?")[1]))
    expect(parseWallFilter(qs)).toEqual({ entity: "driver", color: "red" })
  })

  it("omits the inactive facet so toggling one preserves only the other", () => {
    expect(wallHref({ entity: "truck", color: null })).toBe("/hub/compliance?entity=truck")
    expect(wallHref({ entity: null, color: "amber" })).toBe("/hub/compliance?color=amber")
  })
})

describe("entityCounts", () => {
  it("counts per entity across the whole wall, zeroes included", () => {
    expect(entityCounts(WALL)).toEqual({ driver: 2, truck: 2, trailer: 1, company: 1 })
    expect(entityCounts([])).toEqual({ driver: 0, truck: 0, trailer: 0, company: 0 })
  })
})
