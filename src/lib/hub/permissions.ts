import type { HubRole } from "./types"

/**
 * Role × resource permission matrix. Checked at the action/data layer —
 * never UI-only. `platform_admin` is reserved (activated in Phase 7).
 */
export type HubAction =
  | "loads:read" | "loads:write" | "loads:status"
  | "fleet:read" | "fleet:write"
  | "drivers:read" | "drivers:write"
  | "customers:read" | "customers:write"
  | "documents:read" | "documents:write"
  | "money:read" | "money:write" | "money:approve"
  | "fuel:read" | "fuel:write"
  | "compliance:read" | "compliance:write"
  | "imports:run"
  | "users:manage"
  | "settings:manage"

const OFFICE_READ: HubAction[] = [
  "loads:read", "fleet:read", "drivers:read", "customers:read", "documents:read",
  "money:read", "fuel:read", "compliance:read",
]

const MATRIX: Record<HubRole, ReadonlySet<HubAction>> = {
  owner: new Set<HubAction>([
    ...OFFICE_READ,
    "loads:write", "loads:status", "fleet:write", "drivers:write", "customers:write",
    "documents:write", "money:write", "money:approve", "fuel:write",
    "compliance:write", "imports:run", "users:manage", "settings:manage",
  ]),
  dispatcher: new Set<HubAction>([
    ...OFFICE_READ,
    "loads:write", "loads:status", "fleet:write", "drivers:write", "customers:write",
    "documents:write", "fuel:write", "compliance:write", "imports:run",
  ]),
  accountant: new Set<HubAction>([
    ...OFFICE_READ,
    "money:write", "money:approve", "documents:write", "fuel:write",
    "compliance:write", "imports:run",
  ]),
  // Driver/broker/shipper surfaces are scoped views built in Phases 4–5;
  // they hold no office permissions.
  driver: new Set<HubAction>([]),
  broker: new Set<HubAction>([]),
  shipper: new Set<HubAction>([]),
  platform_admin: new Set<HubAction>([]),
}

export function can(role: HubRole, action: HubAction): boolean {
  return MATRIX[role]?.has(action) ?? false
}

export function rolesAllowed(action: HubAction): HubRole[] {
  return (Object.keys(MATRIX) as HubRole[]).filter((role) => can(role, action))
}
