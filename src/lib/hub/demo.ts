/**
 * Demo-login gate (Phase 6 go-live hardening).
 *
 * The seeded demo accounts (…@demo.thind) are great for evaluating HaulDesk and
 * dangerous on a production system of record: the credentials are printed on
 * the login screen. Setting HUB_DEMO_LOGIN=false does two things at once —
 * hides the credentials card AND refuses authentication for demo emails, so
 * flipping one env var actually closes the door instead of just hiding it.
 *
 * Default stays ON so nothing changes until go-live explicitly sets it.
 */

export function demoLoginEnabled(): boolean {
  return process.env.HUB_DEMO_LOGIN !== "false"
}

/** True for the seeded demo identities (owner@/dispatch@/driver@…@demo.thind). */
export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.trim().toLowerCase().endsWith("@demo.thind"))
}
