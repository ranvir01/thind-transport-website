"use server"

/**
 * Custom-field definitions + values (Twenty-style per-tenant data model).
 * Definitions are owner-only (they shape the whole workspace); values follow
 * the entity's own write permission. Every statement is carrier-scoped.
 */
import { query, queryOne } from "@/lib/hub/db"
import { requireOwner, requirePermission } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import {
  ENTITY_META,
  coerceCustomValues,
  isCustomFieldEntity,
  isCustomFieldKind,
  parseFieldOptions,
  slugifyFieldKey,
  type CustomFieldEntity,
} from "@/lib/hub/custom-fields"
import { listCustomFields } from "@/lib/hub/custom-fields-db"

interface Result {
  ok: boolean
  error?: string
}

export async function createCustomFieldAction(input: {
  entityType: string
  label: string
  kind: string
  /** For select: one option per line. */
  optionsRaw?: string
}): Promise<Result> {
  try {
    const user = await requireOwner()
    const label = input.label.trim().slice(0, 80)
    if (!label) return { ok: false, error: "Give the field a name" }
    if (!isCustomFieldEntity(input.entityType)) return { ok: false, error: "Unknown entity" }
    if (!isCustomFieldKind(input.kind)) return { ok: false, error: "Unknown field type" }
    const key = slugifyFieldKey(label)
    if (!key) return { ok: false, error: "That name needs at least one letter or number" }
    const options = parseFieldOptions(input.kind, input.optionsRaw ?? "")
    if (input.kind === "select" && options.length === 0) {
      return { ok: false, error: "Add at least one option (one per line)" }
    }

    const existing = await queryOne<{ id: string; archived_at: string | null }>(
      `SELECT id, archived_at FROM hub.custom_fields
       WHERE carrier_id = $1 AND entity_type = $2 AND key = $3`,
      [user.carrierId, input.entityType, key]
    )
    if (existing && existing.archived_at == null) {
      return { ok: false, error: `A "${label}" field already exists here` }
    }
    if (existing) {
      // Unarchive under the new label — stored values on entities revive.
      await query(
        `UPDATE hub.custom_fields
         SET archived_at = NULL, label = $3, kind = $4, options = $5
         WHERE id = $1 AND carrier_id = $2`,
        [existing.id, user.carrierId, label, input.kind, JSON.stringify(options)]
      )
    } else {
      await query(
        `INSERT INTO hub.custom_fields (carrier_id, entity_type, key, label, kind, options, position)
         VALUES ($1, $2, $3, $4, $5, $6,
           COALESCE((SELECT MAX(position) + 1 FROM hub.custom_fields
                     WHERE carrier_id = $1 AND entity_type = $2), 0))`,
        [user.carrierId, input.entityType, key, label, input.kind, JSON.stringify(options)]
      )
    }
    await logAudit({
      carrierId: user.carrierId,
      actorName: user.name,
      entityType: "custom_field",
      entityId: `${input.entityType}:${key}`,
      action: existing ? "custom_field_restored" : "custom_field_created",
      newValue: { label, kind: input.kind, options },
    })
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not add the field")
  }
}

export async function archiveCustomFieldAction(fieldId: string): Promise<Result> {
  try {
    const user = await requireOwner()
    const row = await queryOne<{ entity_type: string; key: string }>(
      `UPDATE hub.custom_fields SET archived_at = NOW()
       WHERE id = $1 AND carrier_id = $2 AND archived_at IS NULL
       RETURNING entity_type, key`,
      [fieldId, user.carrierId]
    )
    if (!row) return { ok: false, error: "Field not found" }
    await logAudit({
      carrierId: user.carrierId,
      actorName: user.name,
      entityType: "custom_field",
      entityId: `${row.entity_type}:${row.key}`,
      action: "custom_field_archived",
      newValue: null,
    })
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not archive the field")
  }
}

/**
 * Save an entity's custom values. Unknown keys are dropped; cleared or
 * invalid values remove the key from storage (never store garbage).
 */
export async function saveCustomValuesAction(
  entityType: CustomFieldEntity,
  entityId: string,
  values: Record<string, string>
): Promise<Result> {
  try {
    if (!isCustomFieldEntity(entityType)) return { ok: false, error: "Unknown entity" }
    const meta = ENTITY_META[entityType]
    const user = await requirePermission(meta.write)
    const defs = await listCustomFields(user.carrierId, entityType)
    const coerced = coerceCustomValues(defs, values)
    const set: Record<string, string> = {}
    const remove: string[] = []
    for (const [key, v] of Object.entries(coerced)) {
      if (v == null) remove.push(key)
      else set[key] = v
    }
    const row = await queryOne<{ id: string }>(
      `UPDATE ${meta.table}
       SET custom = (COALESCE(custom, '{}'::jsonb) || $3::jsonb) - $4::text[]
       WHERE id = $1 AND carrier_id = $2
       RETURNING id`,
      [entityId, user.carrierId, JSON.stringify(set), remove]
    )
    if (!row) return { ok: false, error: "Record not found" }
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save details")
  }
}
