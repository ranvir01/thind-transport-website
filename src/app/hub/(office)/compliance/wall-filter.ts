import type { ComplianceColor, ComplianceEntry } from "@/lib/hub/compliance"

/**
 * Server-side filtering for the compliance wall (?entity=&color=). A 15-truck
 * carrier's wall runs 80+ rows; the office needs "just the expired stuff" or
 * "just the trucks" without scanning the whole list. Pure so vitest can pin it.
 */

export const WALL_ENTITIES = ["driver", "truck", "trailer", "company"] as const
export type WallEntity = (typeof WALL_ENTITIES)[number]

export const WALL_ENTITY_LABELS: Record<WallEntity, string> = {
  driver: "Drivers",
  truck: "Trucks",
  trailer: "Trailers",
  company: "Company",
}

const WALL_COLORS: readonly ComplianceColor[] = ["red", "amber", "green"]

export interface WallFilter {
  entity: WallEntity | null
  color: ComplianceColor | null
}

/** Unknown or missing values mean "not filtered" — a mistyped URL shows the whole wall. */
export function parseWallFilter(params: { entity?: string; color?: string }): WallFilter {
  return {
    entity: (WALL_ENTITIES as readonly string[]).includes(params.entity ?? "")
      ? (params.entity as WallEntity)
      : null,
    color: (WALL_COLORS as readonly string[]).includes(params.color ?? "")
      ? (params.color as ComplianceColor)
      : null,
  }
}

export function filterWall(entries: ComplianceEntry[], filter: WallFilter): ComplianceEntry[] {
  if (!filter.entity && !filter.color) return entries
  return entries.filter(
    (entry) =>
      (!filter.entity || entry.entity === filter.entity) &&
      (!filter.color || entry.color === filter.color)
  )
}

/** Href for the wall with the given filter; omits inactive facets so the clean URL stays clean. */
export function wallHref(filter: WallFilter): string {
  const params = new URLSearchParams()
  if (filter.entity) params.set("entity", filter.entity)
  if (filter.color) params.set("color", filter.color)
  const qs = params.toString()
  return qs ? `/hub/compliance?${qs}` : "/hub/compliance"
}

export function entityCounts(entries: ComplianceEntry[]): Record<WallEntity, number> {
  const counts: Record<WallEntity, number> = { driver: 0, truck: 0, trailer: 0, company: 0 }
  for (const entry of entries) counts[entry.entity] += 1
  return counts
}
