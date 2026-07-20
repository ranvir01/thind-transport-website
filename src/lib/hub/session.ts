import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { OFFICE_ROLES, type HubRole } from "./types"
import { can, type HubAction } from "./permissions"

export interface HubSessionUser {
  id: string
  name: string
  email: string
  role: HubRole
  /** Tenant scope — every data call must be scoped to this id. */
  carrierId: string
}

export async function getHubUser(): Promise<HubSessionUser | null> {
  const session = await auth()
  const user = session?.user as
    | (HubSessionUser & { role?: HubRole | null; carrierId?: string | null })
    | undefined
  if (!user?.role) return null
  // Platform admins are the one role without a tenant scope — they see
  // tenant operations only, never a tenant's business data.
  if (!user.carrierId && user.role !== "platform_admin") return null
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: user.role,
    carrierId: user.carrierId ?? "",
  }
}

/**
 * `active` is part of the guard: login checks it, but sessions are JWTs —
 * without this, a deactivated account keeps access until the token expires
 * (~30 days). Fixed for driver/portal already; office/permission guards
 * below now get the same per-request re-check.
 */
async function isActiveUser(user: HubSessionUser): Promise<boolean> {
  const { queryOne } = await import("./db")
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE id = $1 AND carrier_id = $2 AND active`,
    [user.id, user.carrierId]
  )
  return !!row
}

/** Server-side guard for office pages and actions (defense in depth over the proxy). */
export async function requireOfficeUser(): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (!OFFICE_ROLES.includes(user.role)) redirect("/hub/welcome")
  if (!(await isActiveUser(user))) redirect("/hub/login")
  return user
}

export interface DriverSessionUser extends HubSessionUser {
  driverId: string
}

/**
 * Guard for the driver app: signed-in driver role with a linked driver
 * record. Office roles get bounced to their own home.
 */
export async function requireDriverUser(): Promise<DriverSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (OFFICE_ROLES.includes(user.role)) redirect("/hub")
  if (user.role !== "driver") redirect("/hub/welcome")
  const { queryOne } = await import("./db")
  // `active` is part of the guard: login checks it, but sessions are JWTs —
  // without this, a deactivated driver keeps app access until the token
  // expires (same gap fixed for requirePortalUser).
  const row = await queryOne<{ driver_id: string | null }>(
    `SELECT driver_id FROM hub.users WHERE id = $1 AND carrier_id = $2 AND active`,
    [user.id, user.carrierId]
  )
  if (!row?.driver_id) redirect("/hub/welcome")
  return { ...user, driverId: row.driver_id }
}

export interface PortalSessionUser extends HubSessionUser {
  customerId: string
  portalRole: "broker" | "shipper"
}

/**
 * Guard for the external portal: broker/shipper role with a linked customer.
 * The customerId on the session is the isolation boundary — every portal
 * query is scoped to it.
 */
export async function requirePortalUser(): Promise<PortalSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (OFFICE_ROLES.includes(user.role)) redirect("/hub")
  if (user.role === "driver") redirect("/hub/driver")
  if (user.role !== "broker" && user.role !== "shipper") redirect("/hub/welcome")
  const { queryOne } = await import("./db")
  // `active` is part of the guard: login checks it, but sessions are JWTs —
  // without this, a deactivated external account keeps portal access until
  // the token expires.
  const row = await queryOne<{ customer_id: string | null }>(
    `SELECT customer_id FROM hub.users WHERE id = $1 AND carrier_id = $2 AND active`,
    [user.id, user.carrierId]
  )
  if (!row?.customer_id) redirect("/hub/welcome")
  return { ...user, customerId: row.customer_id, portalRole: user.role }
}

/** Owner-only guard (user management, settings). */
export async function requireOwner(): Promise<HubSessionUser> {
  const user = await requireOfficeUser()
  if (user.role !== "owner") redirect("/hub")
  return user
}

/**
 * Permission guard for server actions: resolves the session and checks the
 * role × resource matrix at the data layer, never UI-only. Throws on failure
 * so actions return a clean error instead of partially executing.
 */
export async function requirePermission(action: HubAction): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) throw new Error("Not signed in")
  if (!can(user.role, action)) throw new Error(`Forbidden: ${user.role} cannot ${action}`)
  if (!(await isActiveUser(user))) throw new Error("Account deactivated")
  return user
}

/** Page-level permission guard (redirects instead of throwing). */
export async function requirePermissionPage(action: HubAction): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (!can(user.role, action)) {
    if (!OFFICE_ROLES.includes(user.role)) redirect("/hub/welcome")
    redirect("/hub")
  }
  if (!(await isActiveUser(user))) redirect("/hub/login")
  return user
}
