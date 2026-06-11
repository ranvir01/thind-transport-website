"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import { requireOfficeUser, requireOwner } from "@/lib/hub/session"
import { driverSchema, customerSchema, contactSchema, hubUserSchema } from "@/lib/hub/schemas"
import { createDriver, updateDriver } from "@/lib/hub/drivers"
import { createCustomer, updateCustomer, createContact, deleteContact } from "@/lib/hub/customers"
import { createHubUser, setHubUserActive } from "@/lib/hub/users"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"
import type { ActionResult } from "./fleet"

function firstError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid input"
}

export async function saveDriverAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = driverSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const driver = id ? await updateDriver(id, parsed.data) : await createDriver(parsed.data)
    if (!driver) return { ok: false, error: "Driver not found" }
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "driver", entityId: driver.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/drivers")
    return { ok: true, id: driver.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save driver" }
  }
}

export async function saveCustomerAction(
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  const user = await requireOfficeUser()
  const parsed = customerSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const input = { ...parsed.data, credit_limit: parsed.data.credit_limit ?? null }
    const customer = id ? await updateCustomer(id, input) : await createCustomer(input)
    if (!customer) return { ok: false, error: "Customer not found" }
    await logAudit({
      actorId: user.id, actorName: user.name,
      entityType: "customer", entityId: customer.id,
      action: id ? "update" : "create", newValue: parsed.data,
    })
    revalidatePath("/hub/customers")
    return { ok: true, id: customer.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save customer" }
  }
}

export async function addContactAction(values: Record<string, unknown>): Promise<ActionResult> {
  await requireOfficeUser()
  const parsed = contactSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  try {
    const contact = await createContact(parsed.data)
    revalidatePath(`/hub/customers/${parsed.data.customer_id}`)
    return { ok: true, id: contact.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add contact" }
  }
}

export async function removeContactAction(id: string, customerId: string): Promise<ActionResult> {
  await requireOfficeUser()
  try {
    await deleteContact(id)
    revalidatePath(`/hub/customers/${customerId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to remove contact" }
  }
}

export async function addCrmNoteAction(input: {
  customerId: string
  body: string
  kind: "note" | "call" | "email"
}): Promise<ActionResult> {
  const user = await requireOfficeUser()
  if (!input.body.trim()) return { ok: false, error: "Note cannot be empty" }
  try {
    await query(
      `INSERT INTO hub.crm_activities (customer_id, kind, body, actor_id, actor_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.customerId, input.kind, input.body.trim(), user.id, user.name]
    )
    revalidatePath(`/hub/customers/${input.customerId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add note" }
  }
}

// ---- Hub users (owner only) ----

export async function createHubUserAction(values: Record<string, unknown>): Promise<ActionResult> {
  const owner = await requireOwner()
  const parsed = hubUserSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const user = await createHubUser({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
    })
    await logAudit({
      actorId: owner.id, actorName: owner.name,
      entityType: "user", entityId: user.id,
      action: "create", newValue: { email: user.email, role: user.role },
    })
    revalidatePath("/hub/settings/users")
    return { ok: true, id: user.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user"
    return { ok: false, error: message.includes("unique") ? "Email already has an account" : message }
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const owner = await requireOwner()
  if (id === owner.id) return { ok: false, error: "You cannot deactivate your own account" }
  try {
    await setHubUserActive(id, active)
    await logAudit({
      actorId: owner.id, actorName: owner.name,
      entityType: "user", entityId: id,
      action: active ? "activate" : "deactivate",
    })
    revalidatePath("/hub/settings/users")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update user" }
  }
}
