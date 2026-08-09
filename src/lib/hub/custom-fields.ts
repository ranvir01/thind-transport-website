/**
 * Per-tenant custom fields (Twenty-style): each carrier extends loads,
 * drivers, trucks and customers with its own fields — reefer temp ranges,
 * customer portal codes, terminal assignments — without waiting on us.
 *
 * Definitions: hub.custom_fields (carrier-scoped, archivable, keyed).
 * Values: `custom` JSONB on the entity table, validated against the
 * definitions on every write; unknown keys are dropped, never stored.
 */

export const CUSTOM_FIELD_ENTITIES = ["load", "driver", "truck", "customer"] as const
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number]

export const CUSTOM_FIELD_KINDS = ["text", "number", "date", "select"] as const
export type CustomFieldKind = (typeof CUSTOM_FIELD_KINDS)[number]

export interface CustomFieldDef {
  id: string
  entityType: CustomFieldEntity
  key: string
  label: string
  kind: CustomFieldKind
  options: string[]
  position: number
  archived: boolean
}

/** Entity table + write-permission per entity — single source for actions/UI. */
export const ENTITY_META: Record<
  CustomFieldEntity,
  { table: string; write: "loads:write" | "drivers:write" | "fleet:write" | "customers:write"; label: string }
> = {
  load: { table: "hub.loads", write: "loads:write", label: "Loads" },
  driver: { table: "hub.drivers", write: "drivers:write", label: "Drivers" },
  truck: { table: "hub.trucks", write: "fleet:write", label: "Trucks" },
  customer: { table: "hub.customers", write: "customers:write", label: "Brokers & customers" },
}

/** "Reefer temp (°F)" → "reefer_temp_f"; stable, SQL/JSON-safe, ≤48 chars. */
export function slugifyFieldKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[°]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48)
}

export function isCustomFieldEntity(v: string): v is CustomFieldEntity {
  return (CUSTOM_FIELD_ENTITIES as readonly string[]).includes(v)
}

export function isCustomFieldKind(v: string): v is CustomFieldKind {
  return (CUSTOM_FIELD_KINDS as readonly string[]).includes(v)
}

/** Options input (textarea, one per line) → clean unique list; [] unless select. */
export function parseFieldOptions(kind: CustomFieldKind, raw: string): string[] {
  if (kind !== "select") return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split("\n")) {
    const v = line.trim().slice(0, 80)
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out.slice(0, 50)
}

/**
 * Validate + coerce one submitted value against its definition.
 * Returns the storable value, or null to store nothing (cleared / invalid).
 * Values are stored as strings (numbers normalized) — JSONB stays uniform.
 */
export function coerceFieldValue(def: Pick<CustomFieldDef, "kind" | "options">, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  switch (def.kind) {
    case "text":
      return v.slice(0, 500)
    case "number": {
      const n = Number(v.replace(/,/g, ""))
      return Number.isFinite(n) ? String(n) : null
    }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
    case "select":
      return def.options.includes(v) ? v : null
  }
}

/**
 * Validate a whole submission: unknown keys dropped, each value coerced.
 * Cleared/invalid values come back as null so the writer can strip them.
 */
export function coerceCustomValues(
  defs: Pick<CustomFieldDef, "key" | "kind" | "options">[],
  submitted: Record<string, string>
): Record<string, string | null> {
  const byKey = new Map(defs.map((d) => [d.key, d]))
  const out: Record<string, string | null> = {}
  for (const [key, raw] of Object.entries(submitted)) {
    const def = byKey.get(key)
    if (!def) continue
    out[key] = coerceFieldValue(def, raw ?? "")
  }
  return out
}
