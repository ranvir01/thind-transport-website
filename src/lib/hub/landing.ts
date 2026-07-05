import type { HubRole } from "./types"

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
