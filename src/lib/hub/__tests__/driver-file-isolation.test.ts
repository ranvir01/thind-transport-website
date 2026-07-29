/**
 * The acceptance proof for the driver file ACL, against a real database.
 *
 * driver-file-visibility.test.ts pins the SHAPE of the query with a mocked db;
 * this runs it. Before driverFileVisible existed, /api/hub/files/[name] gave
 * any signed-in driver every file their carrier owned — the seeded
 * `harpreet-cdl.pdf` is a real driver's CDL scan sitting behind nothing but a
 * filename, and settlement statements sat beside it.
 *
 * Every id is looked up, never hard-coded: `npm run seed:demo` mints fresh
 * UUIDs on each run, so pinning them passes once and then fails on the next
 * reseed. Only the stable keys — the demo login email, a document's
 * entity_type/kind, a load reference — are written down.
 *
 * Same skip contract as portal-isolation.test.ts: a silent skip on an
 * isolation proof is worse than not having one, so the skip is loud.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local")
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadEnvLocal()

const hasDb = Boolean(process.env.POSTGRES_URL)

if (!hasDb) {
  console.warn(
    "\n⚠️  driver-file-isolation.test.ts SKIPPED — no POSTGRES_URL.\n" +
      "   This is the cross-driver proof for /api/hub/files/[name].\n" +
      "   It runs in CI (e2e-suite.yml provides postgres:16). Locally, set\n" +
      "   POSTGRES_URL in .env.local to actually exercise it.\n"
  )
}

const suite = hasDb ? describe : describe.skip

describe("driver file isolation suite ran", () => {
  it("executes wherever a database is configured", () => {
    expect(hasDb || !process.env.CI).toBe(true)
  })
})

const basename = (url: string) => url.split("/").pop() as string

suite("driverFileVisible against seeded data", () => {
  let driverFileVisible: typeof import("../driver-app").driverFileVisible
  let query: typeof import("../db").query

  let carrierId: string
  let driverUserId: string // the seeded driver login (Harpreet)
  let cdlFile: string // that driver's own CDL scan
  let podFile: string // a POD on a load driven by SOMEONE ELSE
  let otherDriverUserId: string // a second driver login in the same carrier

  beforeAll(async () => {
    ;({ driverFileVisible } = await import("../driver-app"))
    ;({ query } = await import("../db"))

    const [account] = await query<{ id: string; carrier_id: string; driver_id: string }>(
      `SELECT id, carrier_id, driver_id FROM hub.users WHERE email = 'driver@demo.thind'`
    )
    driverUserId = account.id
    carrierId = account.carrier_id

    const [cdl] = await query<{ url: string }>(
      `SELECT url FROM hub.documents
       WHERE carrier_id = $1 AND entity_type = 'driver' AND kind = 'cdl' AND entity_id = $2`,
      [carrierId, account.driver_id]
    )
    cdlFile = basename(cdl.url)

    // A POD on a load this driver does NOT drive. The seed puts its one POD on
    // another driver's load, which is exactly the case worth proving.
    const [pod] = await query<{ url: string; driver_id: string }>(
      `SELECT d.url, l.driver_id FROM hub.documents d
         JOIN hub.loads l ON l.id = d.entity_id AND l.carrier_id = d.carrier_id
       WHERE d.carrier_id = $1 AND d.entity_type = 'load' AND d.kind = 'pod'
         AND l.driver_id IS NOT NULL AND l.driver_id <> $2
       LIMIT 1`,
      [carrierId, account.driver_id]
    )
    podFile = basename(pod.url)

    // The seed ships ten Thind drivers but only one login, so the cross-driver
    // case this ACL exists for cannot be expressed without adding one. Give it
    // the driver who actually drives the POD's load.
    const [probe] = await query<{ id: string }>(
      `INSERT INTO hub.users (email, password_hash, name, role, carrier_id, driver_id, active)
       VALUES ('isolation-probe@demo.thind', 'not-a-usable-hash', 'Isolation Probe', 'driver', $1, $2, TRUE)
       ON CONFLICT (email) DO UPDATE SET driver_id = EXCLUDED.driver_id, active = TRUE
       RETURNING id`,
      [carrierId, pod.driver_id]
    )
    otherDriverUserId = probe.id
  })

  it("lets a driver read their OWN cdl scan", async () => {
    expect(await driverFileVisible(carrierId, driverUserId, cdlFile)).toBe(true)
  })

  it("refuses another driver's cdl scan to a same-carrier driver", async () => {
    // The exposure, in one line: same carrier, real login, someone else's CDL.
    expect(await driverFileVisible(carrierId, otherDriverUserId, cdlFile)).toBe(false)
  })

  it("refuses a POD on a load the driver does not drive", async () => {
    expect(await driverFileVisible(carrierId, driverUserId, podFile)).toBe(false)
  })

  it("lets the assigned driver read their own load's POD", async () => {
    expect(await driverFileVisible(carrierId, otherDriverUserId, podFile)).toBe(true)
  })

  it("refuses the carrier packet documents the portal exposes to brokers", async () => {
    // entity_type 'carrier' matches no branch — a driver is not a broker.
    const docs = await query<{ url: string }>(
      `SELECT url FROM hub.documents WHERE carrier_id = $1 AND entity_type = 'carrier' LIMIT 1`,
      [carrierId]
    )
    if (docs.length === 0) return
    expect(await driverFileVisible(carrierId, driverUserId, basename(docs[0].url))).toBe(false)
  })

  it("refuses a driver whose account has been deactivated", async () => {
    await query(`UPDATE hub.users SET active = FALSE WHERE id = $1`, [otherDriverUserId])
    expect(await driverFileVisible(carrierId, otherDriverUserId, podFile)).toBe(false)
    await query(`UPDATE hub.users SET active = TRUE WHERE id = $1`, [otherDriverUserId])
  })

  it("refuses a driver of ANOTHER carrier the same file", async () => {
    const [other] = await query<{ id: string; carrier_id: string }>(
      `SELECT id, carrier_id FROM hub.users WHERE role = 'driver' AND carrier_id <> $1 LIMIT 1`,
      [carrierId]
    )
    if (!other) return
    expect(await driverFileVisible(other.carrier_id, other.id, cdlFile)).toBe(false)
    // ...and passing the OWNING carrier with a foreign user must not help.
    expect(await driverFileVisible(carrierId, other.id, cdlFile)).toBe(false)
  })

  it("refuses a file that does not exist at all", async () => {
    expect(await driverFileVisible(carrierId, driverUserId, "no-such-file.pdf")).toBe(false)
  })
})
