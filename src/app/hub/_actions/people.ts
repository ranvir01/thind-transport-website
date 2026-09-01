"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import { requirePermission } from "@/lib/hub/session"
import { driverSchema, customerSchema, contactSchema, hubUserSchema } from "@/lib/hub/schemas"
import { createDriver, updateDriver, getDriver } from "@/lib/hub/drivers"
import { createCustomer, updateCustomer, createContact, deleteContact, addCrmActivity } from "@/lib/hub/customers"
import { createHubUser, setHubUserActive } from "@/lib/hub/users"
import { getCarrier } from "@/lib/hub/settings"
import { createDriverInviteToken, hasDriverAppAccount, sendDriverInviteEmail } from "@/lib/hub/driver-invite"
import { logAudit } from "@/lib/hub/audit"
import { dollarsToCents } from "@/lib/hub/types"
import { actionError } from "@/lib/hub/action-error"
import { appPublicOrigin } from "@/lib/app-origin"
import type { ActionResult } from "./fleet"

function firstError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input"
}

export async function saveDriverAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("drivers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = driverSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = {
      ...parsed.data,
      escrow_weekly_cents: dollarsToCents(parsed.data.escrow_weekly),
      insurance_weekly_cents: dollarsToCents(parsed.data.insurance_weekly),
    }
    const driver = id
      ? await updateDriver(user.carrierId, id, input)
      : await createDriver(user.carrierId, input)
    if (!driver) return { ok: false, error: "Driver not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "driver", entityId: driver.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/drivers")
    return { ok: true, id: driver.id }
  } catch (err) {
    return actionError(err, "Failed to save driver")
  }
}

/** First-send or resend the driver-app invite — covers manually-added drivers (no invite yet) and expired links (a fresh token overrides the old one). */
export async function resendDriverInviteAction(driverId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("drivers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const driver = await getDriver(user.carrierId, driverId)
    if (!driver) return { ok: false, error: "Driver not found" }
    if (!driver.email) return { ok: false, error: "Add an email address before sending an app invite" }
    if (await hasDriverAppAccount(user.carrierId, driverId)) {
      return { ok: false, error: "This driver already has app access" }
    }
    const carrier = await getCarrier(user.carrierId)
    const { createMailTransport, mailFrom } = await import("@/lib/mailer")
    const sent = await sendDriverInviteEmail(
      createMailTransport(), mailFrom, user.carrierId, carrier?.name ?? "Your carrier",
      { driverId, email: driver.email, firstName: driver.first_name }
    )
    if (!sent) return { ok: false, error: "Could not send the invite — check email settings" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "driver", entityId: driverId,
      action: "send_app_invite", newValue: { email: driver.email },
    })
    revalidatePath(`/hub/drivers/${driverId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to send invite")
  }
}

/**
 * The invite as a URL for an in-person handoff: the office shows it as a QR
 * on the driver page and the driver's phone scans it — no email round-trip
 * for a driver standing at the counter. Same gate, same preconditions, same
 * audit as the emailed invite; the token IS the invitation, so this hands
 * the office user exactly what the email would have.
 */
export async function driverInviteLinkAction(
  driverId: string
): Promise<ActionResult & { url?: string; email?: string }> {
  let user
  try {
    user = await requirePermission("drivers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    const driver = await getDriver(user.carrierId, driverId)
    if (!driver) return { ok: false, error: "Driver not found" }
    if (!driver.email) return { ok: false, error: "Add an email address before creating an app invite" }
    if (await hasDriverAppAccount(user.carrierId, driverId)) {
      return { ok: false, error: "This driver already has app access" }
    }
    const token = createDriverInviteToken({ carrierId: user.carrierId, driverId, email: driver.email })
    if (!token) return { ok: false, error: "Invites need an auth secret configured" }
    const baseUrl = appPublicOrigin()
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "driver", entityId: driverId,
      action: "show_app_invite_qr", newValue: { email: driver.email },
    })
    return { ok: true, url: `${baseUrl}/hub/driver-invite/${token}`, email: driver.email }
  } catch (err) {
    return actionError(err, "Failed to create invite link")
  }
}

export async function saveCustomerAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("customers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = customerSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = {
      ...parsed.data,
      credit_limit_cents: parsed.data.credit_limit != null ? dollarsToCents(parsed.data.credit_limit) : null,
    }
    const customer = id
      ? await updateCustomer(user.carrierId, id, input)
      : await createCustomer(user.carrierId, input)
    if (!customer) return { ok: false, error: "Customer not found" }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "customer", entityId: customer.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/customers")
    return { ok: true, id: customer.id }
  } catch (err) {
    return actionError(err, "Failed to save customer")
  }
}

export async function addContactAction(values: Record<string, unknown>): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("customers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = contactSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  try {
    const contact = await createContact(user.carrierId, parsed.data)
    if (!contact) return { ok: false, error: "Customer not found" }
    revalidatePath(`/hub/customers/${parsed.data.customer_id}`)
    return { ok: true, id: contact.id }
  } catch (err) {
    return actionError(err, "Failed to add contact")
  }
}

export async function removeContactAction(id: string, customerId: string): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("customers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  try {
    await deleteContact(user.carrierId, id)
    revalidatePath(`/hub/customers/${customerId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to remove contact")
  }
}

export async function addCrmNoteAction(input: {
  customerId: string
  body: string
  kind: "note" | "call" | "email"
}): Promise<ActionResult> {
  let user
  try {
    user = await requirePermission("customers:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  if (!input.body.trim()) return { ok: false, error: "Note cannot be empty" }
  try {
    const inserted = await addCrmActivity(user.carrierId, {
      customer_id: input.customerId,
      kind: input.kind,
      body: input.body.trim(),
      actor_id: user.id,
      actor_name: user.name,
    })
    if (!inserted) return { ok: false, error: "Customer not found" }
    revalidatePath(`/hub/customers/${input.customerId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to add note")
  }
}

// ---- Hub users (owner only) ----

export async function createHubUserAction(values: Record<string, unknown>): Promise<ActionResult> {
  let owner
  try {
    owner = await requirePermission("users:manage")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  const parsed = hubUserSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  if (parsed.data.role === "platform_admin") return { ok: false, error: "platform_admin is reserved" }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const user = await createHubUser(owner.carrierId, {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
    })
    await logAudit({
      carrierId: owner.carrierId, actorId: owner.id, actorName: owner.name,
      entityType: "user", entityId: user.id,
      action: "create", newValue: { email: user.email, role: user.role },
    })
    revalidatePath("/hub/settings/users")
    return { ok: true, id: user.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user"
    return { ok: false, error: message.includes("unique") || message.includes("duplicate") ? "Email already has an account" : message }
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  let owner
  try {
    owner = await requirePermission("users:manage")
  } catch (err) {
    return actionError(err, "Forbidden")
  }
  if (id === owner.id) return { ok: false, error: "You cannot deactivate your own account" }
  try {
    await setHubUserActive(owner.carrierId, id, active)
    await logAudit({
      carrierId: owner.carrierId, actorId: owner.id, actorName: owner.name,
      entityType: "user", entityId: id,
      action: active ? "activate" : "deactivate",
    })
    revalidatePath("/hub/settings/users")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Failed to update user")
  }
}
