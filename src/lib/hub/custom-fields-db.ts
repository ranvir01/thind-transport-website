/**
 * Server-side queries for custom fields — separate module so the pure
 * helpers/types in custom-fields.ts stay importable from client components
 * (importing pg in a client bundle breaks the build).
 */
import { query, queryOne } from "@/lib/hub/db"
import {
  ENTITY_META,
  type CustomFieldDef,
  type CustomFieldEntity,
  type CustomFieldKind,
} from "@/lib/hub/custom-fields"

interface DefRow {
  id: string
  entity_type: CustomFieldEntity
  key: string
  label: string
  kind: CustomFieldKind
  options: unknown
  position: number
  archived_at: string | null
}

function rowToDef(row: DefRow): CustomFieldDef {
  return {
    id: row.id,
    entityType: row.entity_type,
    key: row.key,
    label: row.label,
    kind: row.kind,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    position: Number(row.position),
    archived: row.archived_at != null,
  }
}

export async function listCustomFields(
  carrierId: string,
  entity?: CustomFieldEntity,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<CustomFieldDef[]> {
  const rows = await query<DefRow>(
    `SELECT id, entity_type, key, label, kind, options, position, archived_at
     FROM hub.custom_fields
     WHERE carrier_id = $1
       AND ($2::text IS NULL OR entity_type = $2)
       AND ($3::boolean OR archived_at IS NULL)
     ORDER BY entity_type, position, created_at`,
    [carrierId, entity ?? null, includeArchived]
  )
  return rows.map(rowToDef)
}

/** The entity's stored custom values — carrier-scoped like every read. */
export async function getCustomValues(
  carrierId: string,
  entity: CustomFieldEntity,
  entityId: string
): Promise<Record<string, string>> {
  const row = await queryOne<{ custom: unknown }>(
    `SELECT custom FROM ${ENTITY_META[entity].table} WHERE id = $1 AND carrier_id = $2`,
    [entityId, carrierId]
  )
  const custom = row?.custom
  if (custom && typeof custom === "object" && !Array.isArray(custom)) {
    return Object.fromEntries(
      Object.entries(custom as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    )
  }
  return {}
}
