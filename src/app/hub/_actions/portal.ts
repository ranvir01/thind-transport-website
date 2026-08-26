"use server"

import { revalidatePath } from "next/cache"
import { requirePermission, requirePortalUser } from "@/lib/hub/session"
import { acceptInvitation, createPortalInvitation, createQuoteRequest } from "@/lib/hub/portal"
import { getCarrier } from "@/lib/hub/settings"
import { logAudit } from "@/lib/hub/audit"
import { queryOne } from "@/lib/hub/db"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
}

/** Office invites a customer contact into the portal (email with accept link). */
export async function invitePortalUserAction(input: {
  customerId: string
  email: string
  role: "broker" | "shipper"
}): Promise<Result & { acceptUrl?: string }> {
  try {
    const user = await requirePermission("customers:write")
    if (!input.email.includes("@")) return { ok: false, error: "Enter their email" }
    // Runtime allowlist, not just the TS type: invitation role becomes the
    // created account's hub role, so nothing else may ever pass through here.
    if (input.role !== "broker" && input.role !== "shipper") {
      return { ok: false, error: "Portal invitations are broker or shipper only" }
    }
    const customer = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM hub.customers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [user.carrierId, input.customerId]
    )
    if (!customer) return { ok: false, error: "Customer not found" }
    const { token } = await createPortalInvitation(
      user.carrierId, input.customerId, input.email, input.role, user.name
    )
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const acceptUrl = `${baseUrl}/hub/portal/accept/${token}`
    const carrier = await getCarrier(user.carrierId)
    try {
      const { createMailTransport, mailFrom } = await import("@/lib/mailer")
      await createMailTransport().sendMail({
        from: mailFrom(carrier?.name ?? "Carrier"),
        to: input.email.trim(),
        subject: `${carrier?.name ?? "Your carrier"} invited you to track your freight online`,
        text:
          `Hi,\n\n${user.name} at ${carrier?.name ?? "the carrier"} set you up with portal access for ${customer.name}: ` +
          `live load tracking, PODs, invoices, and payment status — no more checking calls.\n\n` +
          `Set your password here (link valid 7 days):\n${acceptUrl}\n`,
      })
    } catch {
      /* email best-effort — the link is shown in the UI either way */
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "customer", entityId: input.customerId, action: "portal_invited",
      newValue: { email: input.email, role: input.role },
    })
    revalidatePath(`/hub/customers/${input.customerId}`)
    return { ok: true, acceptUrl }
  } catch (err) {
    return actionError(err, "Could not invite")
  }
}

/** Public: accept an invitation (token-gated; no session required). */
export async function acceptInvitationAction(
  token: string,
  input: { name: string; password: string }
): Promise<Result & { email?: string }> {
  if (!input.name.trim()) return { ok: false, error: "Tell us your name" }
  if ((input.password ?? "").length < 8) return { ok: false, error: "Password needs 8+ characters" }
  return acceptInvitation(token, input)
}

/** Shipper portal: request a quote → 'quoted' load + CRM activity + office alert. */
export async function portalQuoteRequestAction(input: {
  originCity: string
  originState: string
  destCity: string
  destState: string
  pickupDate?: string
  equipment: "flatbed" | "reefer" | "dry_van"
  weightLbs?: string
  commodity?: string
}): Promise<Result & { reference?: string }> {
  try {
    const user = await requirePortalUser()
    if (!input.originCity.trim() || !input.destCity.trim()) {
      return { ok: false, error: "Origin and destination cities are needed" }
    }
    if (!["flatbed", "reefer", "dry_van"].includes(input.equipment)) {
      return { ok: false, error: "Pick an equipment type" }
    }
    const { reference } = await createQuoteRequest(user.carrierId, user.customerId, {
      originCity: input.originCity.trim(),
      originState: input.originState.trim().toUpperCase().slice(0, 2),
      destCity: input.destCity.trim(),
      destState: input.destState.trim().toUpperCase().slice(0, 2),
      pickupDate: input.pickupDate || null,
      equipment: input.equipment,
      weightLbs: input.weightLbs ? Number(input.weightLbs.replace(/[^0-9]/g, "")) || null : null,
      commodity: input.commodity?.trim() || null,
      requestedByName: user.name,
    })
    revalidatePath("/hub/portal")
    return { ok: true, reference }
  } catch (err) {
    return actionError(err, "Could not send the request")
  }
}
