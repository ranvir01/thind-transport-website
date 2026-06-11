import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { OFFICE_ROLES, type HubRole } from "./types"

export interface HubSessionUser {
  id: string
  name: string
  email: string
  role: HubRole
}

export async function getHubUser(): Promise<HubSessionUser | null> {
  const session = await auth()
  const user = session?.user as (HubSessionUser & { role?: HubRole | null }) | undefined
  if (!user?.role) return null
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: user.role,
  }
}

/** Server-side guard for office pages and actions (defense in depth over the proxy). */
export async function requireOfficeUser(): Promise<HubSessionUser> {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")
  if (!OFFICE_ROLES.includes(user.role)) redirect("/hub/welcome")
  return user
}

/** Owner-only guard (user management, money approvals later). */
export async function requireOwner(): Promise<HubSessionUser> {
  const user = await requireOfficeUser()
  if (user.role !== "owner") redirect("/hub")
  return user
}
