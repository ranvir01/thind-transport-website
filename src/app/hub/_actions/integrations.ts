"use server"

import { revalidatePath } from "next/cache"
import { requireOwner } from "@/lib/hub/session"
import {
  credentialsConfigured, deleteCredentials, saveCredentials, type IntegrationProvider,
} from "@/lib/hub/credentials"
import { runTelematicsSync } from "@/lib/hub/telematics"
import { runEfsSync } from "@/lib/hub/integrations/efs"
import { runComdataSync } from "@/lib/hub/integrations/comdata"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"

interface Result {
  ok: boolean
  error?: string
}

const ALLOWED_FIELDS: Record<string, string[]> = {
  terminal: ["apiKey", "connectionToken"],
  truckercloud: ["apiKey"],
  dat: ["serviceAccountEmail", "password"],
  efs: ["feedUser", "feedPassword"],
  wex: ["feedUser", "feedPassword"],
  comdata: ["apiKey", "apiSecret"],
  mailbox: ["host", "port", "user", "password", "folder"],
}

export async function saveIntegrationCredentialsAction(
  provider: IntegrationProvider,
  payload: Record<string, string>
): Promise<Result> {
  try {
    const user = await requireOwner()
    if (!credentialsConfigured()) {
      return { ok: false, error: "Set CREDENTIALS_KEY (32+ random chars) in the environment first — credentials are encrypted at rest" }
    }
    const allowed = ALLOWED_FIELDS[provider] ?? []
    const clean: Record<string, string> = {}
    for (const field of allowed) {
      if (payload[field]?.trim()) clean[field] = payload[field].trim()
    }
    if (Object.keys(clean).length === 0) return { ok: false, error: "Fill in the credentials" }
    await saveCredentials(user.carrierId, provider, clean, user.id)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "integration", entityId: provider, action: "credentials_saved",
      newValue: { fields: Object.keys(clean) }, // names only — never values
    })
    revalidatePath("/hub/settings/integrations")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" }
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
    return { ok: false, error: err instanceof Error ? err.message : "Could not disconnect" }
  }
}

/** Manual "sync now" for the telematics feed. */
export async function syncTelematicsNowAction(): Promise<Result & { summary?: string }> {
  try {
    const user = await requireOwner()
    const started = new Date()
    try {
      const result = await runTelematicsSync(user.carrierId)
      if (!result.connected) {
        return { ok: false, error: "Terminal isn't connected yet — save credentials first. CSV import keeps working meanwhile." }
      }
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES ($1, 'terminal', $2, NOW(), TRUE, $3)`,
        [user.carrierId, started.toISOString(), JSON.stringify(result)]
      )
      revalidatePath("/hub/settings/integrations")
      return {
        ok: true,
        summary: `${result.pings ?? 0} positions, ${result.hos ?? 0} HOS clocks${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
      }
    } catch (err) {
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES ($1, 'terminal', $2, NOW(), FALSE, $3)`,
        [user.carrierId, started.toISOString(), err instanceof Error ? err.message : "unknown"]
      )
      throw err
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" }
  }
}

/** Manual "sync now" for the EFS/WEX fuel feed. */
export async function syncEfsNowAction(): Promise<Result & { summary?: string }> {
  try {
    const user = await requireOwner()
    const started = new Date()
    try {
      const result = await runEfsSync(user.carrierId)
      if (!result.connected) {
        return { ok: false, error: "EFS isn't connected yet — save feed credentials first. Fuel CSV import keeps working meanwhile." }
      }
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES ($1, 'efs', $2, NOW(), TRUE, $3)`,
        [user.carrierId, started.toISOString(), JSON.stringify(result)]
      )
      revalidatePath("/hub/settings/integrations")
      revalidatePath("/hub/fuel")
      return {
        ok: true,
        summary: `${result.imported ?? 0} transactions, ${result.skipped ?? 0} already on file${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
      }
    } catch (err) {
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES ($1, 'efs', $2, NOW(), FALSE, $3)`,
        [user.carrierId, started.toISOString(), err instanceof Error ? err.message : "unknown"]
      )
      throw err
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" }
  }
}

/** Manual "sync now" for the Comdata fuel feed. */
export async function syncComdataNowAction(): Promise<Result & { summary?: string }> {
  try {
    const user = await requireOwner()
    const started = new Date()
    try {
      const result = await runComdataSync(user.carrierId)
      if (!result.connected) {
        return { ok: false, error: "Comdata isn't connected yet — save API credentials first. Fuel CSV import keeps working meanwhile." }
      }
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, counts)
         VALUES ($1, 'comdata', $2, NOW(), TRUE, $3)`,
        [user.carrierId, started.toISOString(), JSON.stringify(result)]
      )
      revalidatePath("/hub/settings/integrations")
      revalidatePath("/hub/fuel")
      return {
        ok: true,
        summary: `${result.imported ?? 0} transactions, ${result.skipped ?? 0} already on file${result.unmatched?.length ? `, unmatched units: ${result.unmatched.join(", ")}` : ""}`,
      }
    } catch (err) {
      await query(
        `INSERT INTO hub.integration_syncs (carrier_id, source, started_at, finished_at, ok, error)
         VALUES ($1, 'comdata', $2, NOW(), FALSE, $3)`,
        [user.carrierId, started.toISOString(), err instanceof Error ? err.message : "unknown"]
      )
      throw err
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" }
  }
}
