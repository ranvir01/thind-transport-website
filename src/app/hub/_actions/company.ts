"use server"

/**
 * Owner-editable company profile — the hub.carriers row the signup wizard
 * seeds once. Name, phone, email, and address flow onto invoices, settlement
 * PDFs, customer statements, and the carrier packet, so this is how an owner
 * fixes a typo after signup. DOT/MC are deliberately not editable here:
 * they're FMCSA-verified at signup, and authority numbers changing should
 * never be a silent self-serve edit.
 */
import { revalidatePath } from "next/cache"
import { query } from "@/lib/hub/db"
import { requireOwner } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

export interface CompanyProfileInput {
  name: string
  phone: string
  email: string
  address: string
}

/**
 * Owner sets where LoadOff emails the office: the weekly owner digest,
 * compliance expiry alerts, and the CC on 20-day overdue invoice reminders
 * all go to notifications.officeEmail. Seeded with the owner's email at
 * signup; blank turns those emails off (the read path defaults to null).
 */
export async function updateOfficeEmailAction(email: string): Promise<Result> {
  try {
    const user = await requireOwner()
    const normalized = email.trim().toLowerCase()
    if (normalized && !/^\S+@\S+\.\S+$/.test(normalized)) {
      return { ok: false, error: "That email doesn't look right" }
    }
    if (normalized.length > 254) return { ok: false, error: "That email is too long" }
    if (!normalized) {
      // Delete the key instead of storing "" so the read path's defaulting
      // (null = emails off) stays the single meaning of "unset".
      await query(
        `UPDATE hub.carrier_settings
         SET settings = settings #- '{notifications,officeEmail}', updated_at = NOW()
         WHERE carrier_id = $1`,
        [user.carrierId]
      )
    } else {
      // jsonb_set can't create the missing '{notifications}' parent key, so
      // seed the parent first; the upsert also covers a carrier with no
      // settings row at all.
      await query(
        `INSERT INTO hub.carrier_settings (carrier_id, settings)
         VALUES ($1, jsonb_build_object('notifications', jsonb_build_object('officeEmail', $2::text)))
         ON CONFLICT (carrier_id) DO UPDATE SET
           settings = jsonb_set(
             jsonb_set(hub.carrier_settings.settings, '{notifications}',
               COALESCE(hub.carrier_settings.settings->'notifications', '{}'::jsonb), TRUE),
             '{notifications,officeEmail}', to_jsonb($2::text), TRUE),
           updated_at = NOW()`,
        [user.carrierId, normalized]
      )
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier", entityId: user.carrierId, action: "notifications_updated",
      newValue: { officeEmail: normalized || null },
    })
    revalidatePath("/hub/settings/users")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save the notification email")
  }
}

export async function updateCompanyProfileAction(input: CompanyProfileInput): Promise<Result> {
  try {
    const user = await requireOwner()
    const name = input.name.trim()
    if (!name) return { ok: false, error: "Company name is required" }
    if (name.length > 120) return { ok: false, error: "Company name is too long" }
    const phone = input.phone.trim() || null
    const email = input.email.trim() || null
    const address = input.address.trim() || null
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return { ok: false, error: "That email doesn't look right" }
    }
    await query(
      `UPDATE hub.carriers SET name = $2, phone = $3, email = $4, address = $5, updated_at = NOW()
       WHERE id = $1`,
      [user.carrierId, name, phone, email, address]
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier", entityId: user.carrierId, action: "profile_updated",
      newValue: { name, phone, email, address },
    })
    revalidatePath("/hub/settings/users")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save the company profile")
  }
}
