/**
 * Demo-login gate (Phase 6 go-live hardening).
 *
 * The seeded demo accounts are great for evaluating LoadOff and dangerous on a
 * production system of record: they all share one bcrypt hash of a password
 * printed on the login screen. Setting HUB_DEMO_LOGIN=false does two things at
 * once — hides the credentials card AND refuses authentication for seeded
 * emails, so flipping one env var actually closes the door instead of just
 * hiding it.
 *
 * That promise was only two-thirds true. This matched `@demo.thind` alone,
 * while scripts/seed-demo.mjs creates NINE logins on the same password across
 * three domains — including `admin@hauldesk.app`, whose role is
 * `platform_admin`, the highest privilege in the system, and both
 * `@cascademo.example` users of the second tenant. The kill switch left the
 * most privileged seeded account open.
 *
 * seed-demo.mjs does refuse to run against production on its own
 * (VERCEL_ENV/URL heuristics, overridable with DEMO_SEED_OK=1), so this is
 * defense in depth rather than a live breach — but it is the layer that has
 * to hold when the first one is bypassed by a laptop pointed at a prod
 * database whose URL says neither "prod" nor "thindtransport".
 *
 * demo.test.ts parses the seed script and asserts every login it creates is
 * matched here, so adding a seeded account without covering it fails the
 * build rather than quietly widening the door.
 *
 * Default stays ON so nothing changes until go-live explicitly sets it.
 */

export function demoLoginEnabled(): boolean {
  return process.env.HUB_DEMO_LOGIN !== "false"
}

/** Domains under which the seed creates login accounts. */
const SEEDED_LOGIN_DOMAINS = ["@demo.thind", "@cascademo.example"] as const

/** Seeded logins that don't share a demo domain — notably the platform admin. */
const SEEDED_LOGIN_EMAILS = ["admin@hauldesk.app"] as const

/**
 * True for any identity scripts/seed-demo.mjs can log in as — all six
 * `@demo.thind` roles, both `@cascademo.example` tenant-2 users, and the
 * `admin@hauldesk.app` platform admin.
 */
export function isDemoEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  return (
    SEEDED_LOGIN_DOMAINS.some((domain) => normalized.endsWith(domain)) ||
    SEEDED_LOGIN_EMAILS.includes(normalized as (typeof SEEDED_LOGIN_EMAILS)[number])
  )
}
