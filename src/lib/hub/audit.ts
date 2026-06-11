import { query } from "./db"

export async function logAudit(entry: {
  carrierId?: string | null
  actorId?: string | null
  actorName?: string | null
  entityType: string
  entityId: string
  action: string
  oldValue?: unknown
  newValue?: unknown
}): Promise<void> {
  try {
    await query(
      `INSERT INTO hub.audit_log (carrier_id, actor_id, actor_name, entity_type, entity_id, action, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.carrierId ?? null,
        entry.actorId ?? null,
        entry.actorName ?? null,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValue != null ? JSON.stringify(entry.oldValue) : null,
        entry.newValue != null ? JSON.stringify(entry.newValue) : null,
      ]
    )
  } catch (err) {
    // Audit must never take down the action itself, but always surface in logs.
    console.error("Audit log write failed:", err)
  }
}

export async function getAuditTrail(entityType: string, entityId: string) {
  return query<{
    id: number
    actor_name: string | null
    action: string
    old_value: unknown
    new_value: unknown
    created_at: string
  }>(
    `SELECT id, actor_name, action, old_value, new_value, created_at
     FROM hub.audit_log WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 100`,
    [entityType, entityId]
  )
}
