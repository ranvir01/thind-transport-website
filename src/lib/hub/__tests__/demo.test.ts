/**
 * Go-live gate: HUB_DEMO_LOGIN=false must identify every seeded demo account —
 * a miss here means printed credentials still work on a production system.
 */
import { afterEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { demoLoginEnabled, isDemoEmail } from "../demo"

/**
 * Every login scripts/seed-demo.mjs creates, read from the seed itself.
 *
 * Hard-coding this list is what let the gate drift: it covered `@demo.thind`
 * while the seed also creates `admin@hauldesk.app` (role platform_admin — the
 * highest privilege in the system) and two `@cascademo.example` tenant-2
 * users, all on the same printed password. Parsing the source means a new
 * seeded account that isn't covered fails this test instead of silently
 * staying loggable after HUB_DEMO_LOGIN=false.
 */
function seededLoginEmails(): string[] {
  const seed = readFileSync(path.join(process.cwd(), "scripts", "seed-demo.mjs"), "utf-8")
  const emails = new Set<string>()
  // Each INSERT INTO hub.users is followed within a few lines by its params
  // array carrying the literal email.
  for (const block of seed.split("INSERT INTO hub.users").slice(1)) {
    for (const [, email] of block.slice(0, 600).matchAll(/"([a-z0-9._+-]+@[a-z0-9.-]+)"/g)) {
      emails.add(email)
    }
  }
  return [...emails]
}

const ORIGINAL = process.env.HUB_DEMO_LOGIN

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HUB_DEMO_LOGIN
  else process.env.HUB_DEMO_LOGIN = ORIGINAL
})

describe("isDemoEmail", () => {
  it("matches every seeded demo identity, case/space insensitive", () => {
    expect(isDemoEmail("owner@demo.thind")).toBe(true)
    expect(isDemoEmail("dispatch@demo.thind")).toBe(true)
    expect(isDemoEmail("  Driver@Demo.Thind ")).toBe(true)
  })

  it("covers the platform admin and the second tenant, not just @demo.thind", () => {
    // The regression: HUB_DEMO_LOGIN=false left the highest-privilege seeded
    // account loggable with a password printed on the login screen.
    expect(isDemoEmail("admin@hauldesk.app")).toBe(true)
    expect(isDemoEmail("owner@cascademo.example")).toBe(true)
    expect(isDemoEmail("driver@cascademo.example")).toBe(true)
  })

  it("matches every login the seed script actually creates", () => {
    const seeded = seededLoginEmails()
    // Guard against a parser that silently matches nothing.
    expect(seeded.length).toBeGreaterThanOrEqual(3)
    for (const email of seeded) {
      expect(isDemoEmail(email), `${email} is seeded but survives HUB_DEMO_LOGIN=false`).toBe(true)
    }
  })

  it("never flags real accounts", () => {
    expect(isDemoEmail("ranvir@thindtransport.com")).toBe(false)
    expect(isDemoEmail("demo.thind@gmail.com")).toBe(false)
    expect(isDemoEmail(null)).toBe(false)
    expect(isDemoEmail("")).toBe(false)
  })
})

describe("demoLoginEnabled", () => {
  it("defaults on; only the literal 'false' disables it", () => {
    delete process.env.HUB_DEMO_LOGIN
    expect(demoLoginEnabled()).toBe(true)
    process.env.HUB_DEMO_LOGIN = "true"
    expect(demoLoginEnabled()).toBe(true)
    process.env.HUB_DEMO_LOGIN = "false"
    expect(demoLoginEnabled()).toBe(false)
  })
})
