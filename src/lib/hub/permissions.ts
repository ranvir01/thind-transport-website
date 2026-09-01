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
  // The office task board. Every office role works it, so the grant is broad —
  // but the matrix is the single source of truth for who may do what, and
  // until these existed src/app/hub/_actions/tasks.ts had nothing to gate on
  // and fell back to "any office role" by default.
  | "tasks:read" | "tasks:write"
  | "imports:run"
  | "users:manage"
  | "settings:manage"

const OFFICE_READ: HubAction[] = [
  "loads:read", "fleet:read", "drivers:read", "customers:read", "documents:read",
  "money:read", "fuel:read", "compliance:read", "tasks:read",
]

const MATRIX: Record<HubRole, ReadonlySet<HubAction>> = {
  owner: new Set<HubAction>([
    ...OFFICE_READ,
    "loads:write", "loads:status", "fleet:write", "drivers:write", "customers:write",
    "documents:write", "money:write", "money:approve", "fuel:write",
    "compliance:write", "tasks:write", "imports:run", "users:manage", "settings:manage",
  ]),
  dispatcher: new Set<HubAction>([
    ...OFFICE_READ,
    "loads:write", "loads:status", "fleet:write", "drivers:write", "customers:write",
    "documents:write", "fuel:write", "compliance:write", "tasks:write", "imports:run",
  ]),
  accountant: new Set<HubAction>([
    ...OFFICE_READ,
    "money:write", "money:approve", "documents:write", "fuel:write",
    "compliance:write", "tasks:write", "imports:run",
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

/** All-companies mode is for owner/accounting review. Mutations must pick one company. */
export function isWriteAction(action: HubAction): boolean {
  return action.endsWith(":write") ||
    action.endsWith(":status") ||
    action.endsWith(":approve") ||
    action === "imports:run" ||
    action === "users:manage" ||
    action === "settings:manage"
}
