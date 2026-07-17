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
