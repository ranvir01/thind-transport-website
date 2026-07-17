"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/hub/session"
import {
  credentialsConfigured, deleteCredentials, getCredentials, saveCredentials, type IntegrationProvider,
} from "@/lib/hub/credentials"
import { allowedFields, providerSpec } from "@/lib/hub/integrations/registry"
import { runTelematicsSync } from "@/lib/hub/telematics"
import { runEfsSync } from "@/lib/hub/integrations/efs"
import { runComdataSync } from "@/lib/hub/integrations/comdata"
import { runWexSync } from "@/lib/hub/integrations/wex"
import { runQboSync } from "@/lib/hub/integrations/qbo"
import { retryUnprocessedEvents } from "@/lib/hub/integrations/event-processors"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

// Field allowlist comes from the provider registry — one source of truth
// (src/lib/hub/integrations/registry.ts) for the form, the action, and docs.

export async function saveIntegrationCredentialsAction(
  provider: IntegrationProvider,
  payload: Record<string, string>
): Promise<Result> {
  try {
    const user = await requireOwner()
    if (!credentialsConfigured()) {
      return { ok: false, error: "Set CREDENTIALS_KEY (32+ random chars) in the environment first — credentials are encrypted at rest" }
    }
    // "planned" providers (qbo, factor, truckstop) have no client built yet and
    // aren't in the hub.api_credentials provider CHECK constraint — saving would
    // otherwise surface a raw DB constraint error instead of an honest message.
    if (providerSpec(provider)?.status === "planned") {
      return { ok: false, error: "This integration isn't built yet — nothing to connect" }
    }
    const allowed = allowedFields(provider)
    const clean: Record<string, string> = {}
    for (const field of allowed) {
      if (payload[field]?.trim()) clean[field] = payload[field].trim()
    }
    if (Object.keys(clean).length === 0) return { ok: false, error: "Fill in the credentials" }
    // Merge over whatever is already stored so rotating one field (e.g. a
    // leaked webhook secret) never blanks out the others — saveCredentials
    // itself is a full overwrite (see qbo.ts's refresh-token rotation, which
    // follows the same merge-then-save convention).
    const existing = await getCredentials(user.carrierId, provider)
    await saveCredentials(user.carrierId, provider, { ...existing, ...clean }, user.id)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "integration", entityId: provider, action: "credentials_saved",
      newValue: { fields: Object.keys(clean) }, // names only — never values
    })
    revalidatePath("/hub/settings/integrations")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save")
  }
}

export async function disconnectIntegrationAction(provider: IntegrationProvider): Promise<Result> {
  try {
    const user = await requireOwner()
    await deleteCredentials(user.carrierId, provider)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "integration", entityId: provider, action: "disconnected",
    })
    revalidatePath("/hub/settings/integrations")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not disconnect")
  }
}

/**
 * Manual "sync now", one case per provider with a poll sync loop. Every
 * card's canSync button routes through here — adding a provider's sync
 * loop is a new case, never a new action (registry.ts stays the one place
 * that decides which cards get a Sync now button, via `cronJob`).
 */
export async function syncIntegrationNowAction(
  provider: IntegrationProvider
): Promise<Result & { summary?: string }> {
  try {
    const user = await requireOwner()
    const started = new Date()
    try {
      const result = await runProviderSync(provider, user.carrierId)
      if (!result.connected) {
        return { ok: false, error: `${provider} isn't connected yet — save credentials first. The fallback keeps working meanwhile.` }
      }
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES ($1, $2, $3, NOW(), TRUE, $4)`,
        [user.carrierId, provider, started.toISOString(), JSON.stringify(result)]
      )
      revalidatePath("/hub/settings/integrations")
      return { ok: true, summary: result.summary }
    } catch (err) {
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES ($1, $2, $3, NOW(), FALSE, $4)`,
        [user.carrierId, provider, started.toISOString(), err instanceof Error ? err.message : "unknown"]
      )
      throw err
    }
  } catch (err) {
    return actionError(err, "Sync failed")
  }
}

/**
 * Manual re-drain for webhook events a live delivery couldn't yet apply (no
 * matching invoice, transient DB error mid-drop) — they sit in
 * hub.integration_events with processed_at IS NULL until someone retries.
 * Works for every provider in EVENT_PROCESSORS (event-processors.ts) — a new
 * processor gets its retry surface for free, no case to add here.
 */
export async function retryIntegrationEventsAction(
  provider: IntegrationProvider
): Promise<Result & { summary?: string }> {
  try {
    const user = await requireOwner()
    const result = await retryUnprocessedEvents(user.carrierId, provider)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "integration", entityId: provider, action: "retry_events",
      newValue: result,
    })
    revalidatePath("/hub/settings/integrations")
    return {
      ok: true,
      summary: `${result.applied} applied, ${result.stillUnprocessed} still unmatched (of ${result.retried} retried)`,
    }
  } catch (err) {
    return actionError(err, "Retry failed")
  }
}

async function runProviderSync(
  provider: IntegrationProvider,
  carrierId: string
): Promise<{ connected: boolean; summary?: string }> {
  if (provider === "terminal" || provider === "truckercloud") {
    // Both aggregators share one sync loop — runTelematicsSync picks
    // whichever of the two the carrier actually connected.
    const result = await runTelematicsSync(carrierId)
    return {
      connected: result.connected,
      summary: `${result.pings ?? 0} positions, ${result.hos ?? 0} HOS clocks${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
    }
  }
  if (provider === "efs") {
    const result = await runEfsSync(carrierId)
    return {
      connected: result.connected,
      summary: `${result.imported ?? 0} fuel transactions${result.skipped ? `, ${result.skipped} already synced` : ""}${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
    }
  }
  if (provider === "comdata") {
    const result = await runComdataSync(carrierId)
    return {
      connected: result.connected,
      summary: `${result.imported ?? 0} fuel transactions${result.skipped ? `, ${result.skipped} already synced` : ""}${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
    }
  }
  if (provider === "wex") {
    const result = await runWexSync(carrierId)
    return {
      connected: result.connected,
      summary: `${result.imported ?? 0} fuel transactions${result.skipped ? `, ${result.skipped} already synced` : ""}${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
    }
  }
  if (provider === "qbo") {
    const result = await runQboSync(carrierId)
    return {
      connected: result.connected,
      summary: `${result.imported ?? 0} payments recorded${result.skipped ? `, ${result.skipped} already synced` : ""}${result.unmatched?.length ? `, unmatched invoices: ${result.unmatched.join(", ")}` : ""}`,
    }
  }
  throw new Error(`No sync loop wired for ${provider} yet`)
}
