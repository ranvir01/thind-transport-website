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
 * getHubUser plus the JWT-vs-DB re-checks every guard below performs:
 * returns null for a deactivated user or a suspended carrier instead of
 * redirecting or throwing — the right shape for route handlers and actions
 * that answer 401/403 themselves. Route handlers don't run layouts, so a
 * bare getHubUser there re-opened the ~30-day-token gap the guards closed;
 * use this instead (guarded by route-guard-depth.test.ts).
 */
export async function getActiveHubUser(): Promise<HubSessionUser | null> {
  const user = await getHubUser()
  if (!user) return null
  if (user.role === "platform_admin") {
    return (await isActivePlatformAdmin(user.id)) ? user : null
  }
  if (!(await isActiveUser(user))) return null
  if (!(await isActiveCarrier(user.carrierId))) return null
  return user
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

/**
 * Suspending a tenant (platform admin, see setTenantStatusAction) must cut
 * off that tenant's office/driver/portal access immediately, not just skip
 * it in crons — same JWT-vs-DB-state gap as isActiveUser, so every guard
 * below re-checks the carrier's status on every request too.
 */
async function isActiveCarrier(carrierId: string): Promise<boolean> {
  const { queryOne } = await import("./db")
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM hub.carriers WHERE id = $1 AND status = 'active'`,
    [carrierId]
  )
  return !!row
}

/**
 * Platform admin is the one role without a carrier_id scope (see
 * getHubUser), so it can't reuse isActiveUser's carrier-scoped query —
 * it needs its own re-check by id + role instead.
 */
export async function isActivePlatformAdmin(userId: string): Promise<boolean> {
  const { queryOne } = await import("./db")
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE id = $1 AND role = 'platform_admin' AND active`,
    [userId]
  )
  return !!row
}

/** Server-side guard for the platform admin page (same active re-check as requireOfficeUser). */
export async function requirePlatformAdmin(): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (user.role !== "platform_admin") redirect("/hub")
  if (!(await isActivePlatformAdmin(user.id))) redirect("/hub/login")
  return user
}

/** Server-side guard for office pages and actions (defense in depth over the proxy). */
export async function requireOfficeUser(): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (!OFFICE_ROLES.includes(user.role)) redirect("/hub/welcome")
  // Not /hub/login: the proxy still sees a valid token and bounces /hub/login
  // straight back into the app, which re-hits this same check — an infinite
  // redirect loop. /hub/deactivated is a dead end the proxy lets through.
  if (!(await isActiveUser(user))) redirect("/hub/deactivated")
  if (!(await isActiveCarrier(user.carrierId))) redirect("/hub/suspended")
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
  if (!(await isActiveCarrier(user.carrierId))) redirect("/hub/suspended")
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
  if (!(await isActiveCarrier(user.carrierId))) redirect("/hub/suspended")
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
  if (!(await isActiveCarrier(user.carrierId))) throw new Error("Workspace suspended")
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
  // Same /hub/login-vs-proxy loop as requireOfficeUser — see comment there.
  if (!(await isActiveUser(user))) redirect("/hub/deactivated")
  if (!(await isActiveCarrier(user.carrierId))) redirect("/hub/suspended")
  return user
}
