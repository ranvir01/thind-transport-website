import { describe, expect, it } from "vitest"
import { can, rolesAllowed, type HubAction } from "../permissions"
import { HUB_ROLES } from "../types"

const ALL_ACTIONS: HubAction[] = [
  "loads:read", "loads:write", "loads:status",
  "fleet:read", "fleet:write",
  "drivers:read", "drivers:write",
  "customers:read", "customers:write",
  "documents:read", "documents:write",
  "money:read", "money:write", "money:approve",
  "fuel:read", "fuel:write",
  "compliance:read", "compliance:write",
  "imports:run", "users:manage", "settings:manage",
]

describe("role × resource matrix", () => {
  it("owner can do everything", () => {
    for (const action of ALL_ACTIONS) expect(can("owner", action)).toBe(true)
  })

  it("external + driver roles hold zero office permissions (every combination forbidden)", () => {
    for (const role of ["driver", "broker", "shipper"] as const) {
      for (const action of ALL_ACTIONS) {
        expect(can(role, action), `${role} must not have ${action}`).toBe(false)
      }
    }
  })

  it("dispatcher cannot touch money mutations or user management", () => {
    expect(can("dispatcher", "money:write")).toBe(false)
    expect(can("dispatcher", "money:approve")).toBe(false)
    expect(can("dispatcher", "users:manage")).toBe(false)
    expect(can("dispatcher", "settings:manage")).toBe(false)
    expect(can("dispatcher", "loads:write")).toBe(true)
    expect(can("dispatcher", "money:read")).toBe(true)
  })

  it("accountant approves money but does not manage users or write loads", () => {
    expect(can("accountant", "money:approve")).toBe(true)
    expect(can("accountant", "money:write")).toBe(true)
    expect(can("accountant", "users:manage")).toBe(false)
    expect(can("accountant", "loads:write")).toBe(false)
  })

  it("platform_admin is reserved (no tenant permissions until Phase 7)", () => {
    for (const action of ALL_ACTIONS) expect(can("platform_admin", action)).toBe(false)
  })

  it("only owner manages users and settings", () => {
    expect(rolesAllowed("users:manage")).toEqual(["owner"])
    expect(rolesAllowed("settings:manage")).toEqual(["owner"])
  })

  it("matrix covers every declared role", () => {
    for (const role of HUB_ROLES) {
      // can() must answer (not throw) for every role/action pair
      for (const action of ALL_ACTIONS) {
        expect(typeof can(role, action)).toBe("boolean")
      }
    }
  })
})
