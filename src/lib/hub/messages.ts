/**
 * Communication hub (E3): per-load threads (dispatcher ↔ assigned driver with
 * full office visibility) and direct office ↔ driver threads. Load-thread
 * messages append to load_events — they are part of the permanent record.
 */
import { hubDb, query, queryOne } from "./db"
import { assertCarrierRefs } from "./tenancy"
import type { HubMessage, MessageThread } from "./types"

/** Find or create the thread for a load. */
export async function ensureLoadThread(carrierId: string, loadId: string): Promise<string> {
  await assertCarrierRefs(carrierId, { load_id: loadId })
  const row = await queryOne<{ id: string }>(
    `INSERT INTO hub.message_threads (carrier_id, kind, load_id)
     VALUES ($1, 'load', $2)
     ON CONFLICT (carrier_id, load_id) WHERE kind = 'load'
     DO UPDATE SET carrier_id = EXCLUDED.carrier_id
     RETURNING id`,
    [carrierId, loadId]
  )
  return row!.id
}

/** Find or create the direct office↔driver thread. */
export async function ensureDirectThread(carrierId: string, driverId: string): Promise<string> {
  await assertCarrierRefs(carrierId, { driver_id: driverId })
  const row = await queryOne<{ id: string }>(
    `INSERT INTO hub.message_threads (carrier_id, kind, driver_id)
     VALUES ($1, 'direct', $2)
     ON CONFLICT (carrier_id, driver_id) WHERE kind = 'direct'
     DO UPDATE SET carrier_id = EXCLUDED.carrier_id
     RETURNING id`,
    [carrierId, driverId]
  )
  return row!.id
}

export async function getThread(carrierId: string, threadId: string): Promise<MessageThread | null> {
  return queryOne<MessageThread>(
    `SELECT t.*, l.reference AS load_reference,
       d.first_name || ' ' || d.last_name AS driver_name
     FROM hub.message_threads t
     LEFT JOIN hub.loads l ON l.id = t.load_id AND l.carrier_id = t.carrier_id
     LEFT JOIN hub.drivers d ON d.id = t.driver_id AND d.carrier_id = t.carrier_id
     WHERE t.carrier_id = $1 AND t.id = $2`,
    [carrierId, threadId]
  )
}

/** Office inbox: every thread, most recent first, with unread counts. */
export async function listThreadsForOffice(
  carrierId: string,
  userId: string
): Promise<MessageThread[]> {
  return query<MessageThread>(
    `SELECT t.*, l.reference AS load_reference,
       COALESCE(d.first_name || ' ' || d.last_name, ld.first_name || ' ' || ld.last_name) AS driver_name,
       lm.body AS last_body,
       (SELECT COUNT(*)::int FROM hub.messages m
         WHERE m.thread_id = t.id
           AND m.id > COALESCE((SELECT r.last_read_message_id FROM hub.message_reads r
                                WHERE r.thread_id = t.id AND r.user_id = $2), 0)
           AND m.sender_id IS DISTINCT FROM $2) AS unread_count
     FROM hub.message_threads t
     LEFT JOIN hub.loads l ON l.id = t.load_id AND l.carrier_id = t.carrier_id
     LEFT JOIN hub.drivers d ON d.id = t.driver_id AND d.carrier_id = t.carrier_id
     LEFT JOIN hub.drivers ld ON ld.id = l.driver_id AND ld.carrier_id = t.carrier_id
     LEFT JOIN LATERAL (
       SELECT body FROM hub.messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1
     ) lm ON TRUE
     WHERE t.carrier_id = $1 AND t.last_message_at IS NOT NULL
     ORDER BY t.last_message_at DESC
     LIMIT 100`,
    [carrierId, userId]
  )
}

/** Driver inbox: their direct thread + threads for their loads. */
export async function listThreadsForDriver(
  carrierId: string,
  driverId: string,
  userId: string
): Promise<MessageThread[]> {
  return query<MessageThread>(
    `SELECT t.*, l.reference AS load_reference,
       d.first_name || ' ' || d.last_name AS driver_name,
       lm.body AS last_body,
       (SELECT COUNT(*)::int FROM hub.messages m
         WHERE m.thread_id = t.id
           AND m.id > COALESCE((SELECT r.last_read_message_id FROM hub.message_reads r
                                WHERE r.thread_id = t.id AND r.user_id = $3), 0)
           AND m.sender_id IS DISTINCT FROM $3) AS unread_count
     FROM hub.message_threads t
     LEFT JOIN hub.loads l ON l.id = t.load_id AND l.carrier_id = t.carrier_id
     LEFT JOIN hub.drivers d ON d.id = t.driver_id AND d.carrier_id = t.carrier_id
     LEFT JOIN LATERAL (
       SELECT body FROM hub.messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1
     ) lm ON TRUE
     WHERE t.carrier_id = $1
       AND (t.driver_id = $2 OR l.driver_id = $2)
     ORDER BY t.last_message_at DESC NULLS LAST
     LIMIT 50`,
    [carrierId, driverId, userId]
  )
}

export async function listMessages(
  carrierId: string,
  threadId: string,
  limit = 100
): Promise<HubMessage[]> {
  return query<HubMessage>(
    `SELECT m.*, doc.url AS document_url, doc.mime_type AS document_mime
     FROM hub.messages m
     LEFT JOIN hub.documents doc ON doc.id = m.document_id AND doc.carrier_id = m.carrier_id
     WHERE m.carrier_id = $1 AND m.thread_id = $2
     ORDER BY m.id ASC
     LIMIT $3`,
    [carrierId, threadId, limit]
  )
}

export async function sendMessage(
  carrierId: string,
  threadId: string,
  input: {
    body: string
    documentId?: string | null
    sender: { id: string; name: string; role: string }
  }
): Promise<HubMessage> {
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows } = await client.query(
      `INSERT INTO hub.messages (carrier_id, thread_id, sender_id, sender_name, sender_role, body, document_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [carrierId, threadId, input.sender.id, input.sender.name, input.sender.role, input.body, input.documentId ?? null]
    )
    const { rows: threadRows } = await client.query(
      `UPDATE hub.message_threads SET last_message_at = NOW() WHERE id = $1 AND carrier_id = $2 RETURNING kind, load_id`,
      [threadId, carrierId]
    )
    // Load-thread messages are part of the load record.
    const thread = threadRows[0]
    if (thread?.kind === "load" && thread.load_id) {
      await client.query(
        `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
         VALUES ($1, $2, 'message', $3, $4, $5)`,
        [carrierId, thread.load_id, input.sender.id, input.sender.name,
         JSON.stringify({ body: input.body.slice(0, 300), hasPhoto: Boolean(input.documentId) })]
      )
    }
    // Sender has implicitly read their own message.
    await client.query(
      `INSERT INTO hub.message_reads (thread_id, user_id, last_read_message_id, last_read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_message_id = $3, last_read_at = NOW()`,
      [threadId, input.sender.id, rows[0].id]
    )
    await client.query("COMMIT")
    return rows[0] as HubMessage
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO hub.message_reads (thread_id, user_id, last_read_message_id, last_read_at)
     SELECT $1, $2, COALESCE(MAX(m.id), 0), NOW() FROM hub.messages m WHERE m.thread_id = $1
     ON CONFLICT (thread_id, user_id) DO UPDATE
       SET last_read_message_id = EXCLUDED.last_read_message_id, last_read_at = NOW()`,
    [threadId, userId]
  )
}

/** Read receipt for the chat view: who has seen up to which message. */
export async function threadReads(
  carrierId: string,
  threadId: string
): Promise<{ user_id: string; name: string; last_read_message_id: number }[]> {
  return query(
    `SELECT r.user_id, u.name, r.last_read_message_id
     FROM hub.message_reads r
     JOIN hub.message_threads t ON t.id = r.thread_id AND t.carrier_id = $1
     JOIN hub.users u ON u.id = r.user_id AND u.carrier_id = t.carrier_id
     WHERE r.thread_id = $2`,
    [carrierId, threadId]
  )
}

export async function totalUnreadMessages(carrierId: string, userId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM hub.messages m
     JOIN hub.message_threads t ON t.id = m.thread_id AND t.carrier_id = m.carrier_id
     WHERE t.carrier_id = $1
       AND m.sender_id IS DISTINCT FROM $2
       AND m.id > COALESCE((SELECT r.last_read_message_id FROM hub.message_reads r
                            WHERE r.thread_id = m.thread_id AND r.user_id = $2), 0)`,
    [carrierId, userId]
  )
  return Number(row?.count ?? 0)
}

// ---- Saved templates ("send me the lumper receipt") ----

export async function listTemplates(carrierId: string): Promise<{ id: string; label: string; body: string }[]> {
  return query(
    `SELECT id, label, body FROM hub.message_templates WHERE carrier_id = $1 ORDER BY label`,
    [carrierId]
  )
}

export async function saveTemplate(carrierId: string, label: string, body: string): Promise<void> {
  await query(
    `INSERT INTO hub.message_templates (carrier_id, label, body) VALUES ($1, $2, $3)
     ON CONFLICT (carrier_id, label) DO UPDATE SET body = EXCLUDED.body`,
    [carrierId, label, body]
  )
}

const DEFAULT_TEMPLATES: { label: string; body: string }[] = [
  { label: "Lumper receipt", body: "Can you send me the lumper receipt when you get a sec?" },
  { label: "POD reminder", body: "Don't forget to snap the signed POD before you leave the dock." },
  { label: "ETA check", body: "What's your ETA looking like?" },
  { label: "Scale ticket", body: "Please send the scale ticket for this load." },
]

/** Seed a carrier's starter templates once (no-op if any exist). */
export async function ensureDefaultTemplates(carrierId: string): Promise<void> {
  const existing = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hub.message_templates WHERE carrier_id = $1`,
    [carrierId]
  )
  if (Number(existing?.count ?? 0) > 0) return
  for (const t of DEFAULT_TEMPLATES) {
    await saveTemplate(carrierId, t.label, t.body)
  }
}
