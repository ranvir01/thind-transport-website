/**
 * Provider → webhook-event processor map plus the generic manual re-drain,
 * shared by the receiver route (src/app/api/hub/webhooks/[provider]/route.ts)
 * and `retryIntegrationEventsAction` — one place decides which providers can
 * apply stored events, so the route, the retry action, and the settings-page
 * pending-count surface can never drift on that list. Lives outside the route
 * file because Next.js route modules may only export HTTP handlers.
 */
import { processFactorEvent } from "./factor"
import { processEfsEvent } from "./efs"
import { isEventOutcomeFinal } from "./webhooks"
import { query } from "../db"

export interface IntegrationEvent {
  external_id: string
  kind: string | null
  payload: Record<string, unknown>
}

export interface EventOutcome {
  applied: boolean
  reason?: string
}

export const EVENT_PROCESSORS: Record<
  string,
  (carrierId: string, event: IntegrationEvent) => Promise<EventOutcome>
> = {
  factor: processFactorEvent,
  efs: processEfsEvent,
}

/** Providers whose stuck events can be re-driven — derived, never hand-listed. */
export const EVENT_RETRY_PROVIDERS = new Set(Object.keys(EVENT_PROCESSORS))

export interface RetryEventsResult {
  retried: number
  applied: number
  stillUnprocessed: number
}

/**
 * Manual re-drain for events a live delivery couldn't apply the first time
 * (invoice not created yet, transient DB error mid-drop) — they sit in
 * `hub.integration_events` with `processed_at IS NULL` until someone retries.
 * Capped at 50 per call (oldest first) so a large backlog drains over a few
 * button presses instead of one slow request. Reuses the same
 * `isEventOutcomeFinal` rule the webhook route applies inline, so a retry
 * marks exactly the events a live delivery would have marked.
 */
export async function retryUnprocessedEvents(
  carrierId: string,
  provider: string
): Promise<RetryEventsResult> {
  const processor = EVENT_PROCESSORS[provider]
  if (!processor) throw new Error(`No event retry wired for ${provider} yet`)

  const pending = await query<{ id: string; external_id: string; kind: string | null; payload: Record<string, unknown> }>(
    `SELECT id, external_id, kind, payload FROM hub.integration_events
     WHERE carrier_id = $1 AND provider = $2 AND processed_at IS NULL
     ORDER BY received_at ASC LIMIT 50`,
    [carrierId, provider]
  )

  let applied = 0
  let stillUnprocessed = 0
  for (const row of pending) {
    const outcome = await processor(carrierId, { external_id: row.external_id, kind: row.kind, payload: row.payload })
    if (isEventOutcomeFinal(outcome)) {
      await query(`UPDATE hub.integration_events SET processed_at = NOW() WHERE id = $1`, [row.id])
      if (outcome.applied) applied += 1
    } else {
      stillUnprocessed += 1
    }
  }

  return { retried: pending.length, applied, stillUnprocessed }
}
