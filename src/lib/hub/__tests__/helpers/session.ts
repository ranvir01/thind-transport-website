/**
 * HubSessionUser factory for tests.
 *
 * Written once, deliberately. Test files across this repo hand-build session
 * objects like `{ id, name, role, carrierId }` and omit `email`, which
 * HubSessionUser requires — that single omission accounts for a large block of
 * the suite's type errors, and every file fixed it (or didn't) on its own.
 *
 * Using a factory also means adding a field to HubSessionUser breaks ONE file
 * instead of thirty, and the break is a compile error at the factory rather
 * than thirty silent `as never` casts.
 *
 * Not named *.test.ts, so vitest's include pattern doesn't run it as a suite.
 */
import type { HubSessionUser } from "../../session"
import type { HubRole } from "../../types"

const CARRIER = "11111111-1111-1111-1111-111111111111"

/**
 * A valid session user. Override anything; `email` is derived from the role so
 * two different roles never collide in a test that keys on it.
 */
export function sessionUser(overrides: Partial<HubSessionUser> = {}): HubSessionUser {
  const role = (overrides.role ?? "owner") as HubRole
  return {
    id: `user-${role}`,
    name: `Test ${role}`,
    email: `${role}@thind.test`,
    role,
    carrierId: CARRIER,
    allowedCarrierIds: [CARRIER],
    companyScope: "single",
    dataMode: "production",
    ...overrides,
  }
}

/** The tenant every fixture shares, so cross-tenant tests can pick a different one. */
export const TEST_CARRIER_ID = CARRIER

/** A second tenant, for isolation assertions. */
export const OTHER_CARRIER_ID = "22222222-2222-2222-2222-222222222222"
