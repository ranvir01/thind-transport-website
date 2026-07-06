import type { HubRole } from "./types"

/** Home for legacy driver-portal accounts (signed in, but no hub.role on the token). */
export const LEGACY_DRIVER_HOME = "/driver/application"

/** Post-login home for each LoadOff role (Phase 3). */
export function hubLandingPath(role: HubRole | string | null | undefined): string {
  switch (role) {
    case "accountant":
      return "/hub/money"
    case "dispatcher":
      return "/hub/loadboard"
    case "driver":
      return "/hub/driver"
    case "broker":
    case "shipper":
      return "/hub/portal"
    case "platform_admin":
      return "/hub/admin"
    default:
      return "/hub"
  }
}

/**
 * Where to send an account right after /hub/login. A signed-in user without a
 * hub role is a legacy driver-portal account — its home is the original
 * driver portal, never /hub (the proxy would bounce it straight back to
 * /hub/login). When the session fetch failed entirely (`user` is null) we
 * fall back to /hub and let the proxy route by token.
 */
export function postLoginPath(user: { role?: string | null } | null | undefined): string {
  if (user && !user.role) return LEGACY_DRIVER_HOME
  return hubLandingPath(user?.role)
}

/** Human-readable role label for the login hint badge. */
export function hubRoleLabel(role: HubRole | string): string {
  switch (role) {
    case "owner":
      return "Owner"
    case "dispatcher":
      return "Dispatcher"
    case "accountant":
      return "Accountant"
    case "driver":
      return "Driver"
    case "broker":
      return "Broker portal"
    case "shipper":
      return "Shipper portal"
    case "platform_admin":
      return "Platform admin"
    default:
      return role.replace("_", " ")
  }
}
