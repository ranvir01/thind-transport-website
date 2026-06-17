import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { OFFICE_ROLES, type HubRole } from "./types"
import { can, isWriteAction, type HubAction } from "./permissions"

export interface HubSessionUser {
  id: string
  name: string
  email: string
  role: HubRole
  /** Tenant scope — every data call must be scoped to this id. */
  carrierId: string
  allowedCarrierIds: string[]
  companyScope: "single" | "all"
  dataMode: "production" | "sandbox"
}

export async function getHubUser(): Promise<HubSessionUser | null> {
  const session = await auth()
  const user = session?.user as
    | (HubSessionUser & {
        role?: HubRole | null
        carrierId?: string | null
        allowedCarrierIds?: string[] | null
        dataMode?: "production" | "sandbox" | null
      })
    | undefined
  if (!user?.role || !user.carrierId) return null
  const allowedCarrierIds = user.allowedCarrierIds?.length ? user.allowedCarrierIds : [user.carrierId]
  const cookieStore = await cookies()
  const requestedCarrier = cookieStore.get("hub_carrier_id")?.value
  const requestedScope = cookieStore.get("hub_company_scope")?.value
  const selectedCarrierId =
    requestedCarrier && allowedCarrierIds.includes(requestedCarrier)
      ? requestedCarrier
      : user.carrierId
  const companyScope =
    requestedScope === "all" && allowedCarrierIds.length > 1 ? "all" : "single"

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: user.role,
    carrierId: selectedCarrierId,
    allowedCarrierIds,
    companyScope,
    dataMode: user.dataMode ?? "production",
  }
}

/** Server-side guard for office pages and actions (defense in depth over the proxy). */
export async function requireOfficeUser(): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (!OFFICE_ROLES.includes(user.role)) redirect("/hub/welcome")
  return user
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
  if (user.companyScope === "all" && isWriteAction(action)) {
    throw new Error("Select Thind or ATS before changing data. All-companies mode is read-only.")
  }
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
  if (user.companyScope === "all" && isWriteAction(action)) redirect("/hub")
  return user
}
