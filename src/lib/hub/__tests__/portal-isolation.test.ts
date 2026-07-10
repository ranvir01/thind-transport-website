/**
 * External isolation suite (Phase 5 acceptance): a broker/shipper account can
 * NEVER read another customer's loads, documents, or invoices — and one
 * tenant can never read another tenant's records. Enforced at the query
 * layer; proven here against a real Postgres.
 *
 * Runs when POSTGRES_URL is available (reads .env.local like the scripts do);
 * skips cleanly otherwise so CI without a database stays green.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadEnvLocal()

const hasDb = Boolean(process.env.POSTGRES_URL)
const suite = hasDb ? describe : describe.skip

suite("portal + tenant isolation (query layer)", () => {
  // Imports deferred so the no-DB skip path never touches pg.
  let db: typeof import("../db")
  let portal: typeof import("../portal")
  let loadsLib: typeof import("../loads")

  const T1 = "11111111-1111-1111-1111-111111111111" // Thind (seeded)
  let tenant2: string
  let customerA: string
  let customerB: string
  let loadA: string
  let loadB: string
  let tenant2Load: string
  const suffix = Math.random().toString(36).slice(2, 8)

  beforeAll(async () => {
    db = await import("../db")
    portal = await import("../portal")
    loadsLib = await import("../loads")

    // Second tenant with its own customer + load.
    const t2 = await db.query<{ id: string }>(
      `INSERT INTO hub.carriers (name, dot_number) VALUES ($1, '9999999') RETURNING id`,
      [`Isolation Test Lines ${suffix}`]
    )
    tenant2 = t2[0].id

    const a = await db.query<{ id: string }>(
      `INSERT INTO hub.customers (carrier_id, name, type) VALUES ($1, $2, 'broker') RETURNING id`,
      [T1, `IsoTest Broker A ${suffix}`]
    )
    customerA = a[0].id
    const b = await db.query<{ id: string }>(
      `INSERT INTO hub.customers (carrier_id, name, type) VALUES ($1, $2, 'broker') RETURNING id`,
      [T1, `IsoTest Broker B ${suffix}`]
    )
    customerB = b[0].id

    const mkLoad = async (carrierId: string, customerId: string, ref: string) => {
      const rows = await db.query<{ id: string }>(
        `INSERT INTO hub.loads (carrier_id, reference, customer_id, status, equipment, linehaul_cents, fuel_surcharge_cents)
         VALUES ($1, $2, $3, 'in_transit', 'dry_van', 100000, 10000) RETURNING id`,
        [carrierId, ref, customerId]
      )
      await db.query(
        `INSERT INTO hub.stops (carrier_id, load_id, sequence, type, city, state)
         VALUES ($1, $2, 1, 'pickup', 'Kent', 'WA'), ($1, $2, 2, 'delivery', 'Boise', 'ID')`,
        [carrierId, rows[0].id]
      )
      return rows[0].id
    }
    loadA = await mkLoad(T1, customerA, `ISO-A-${suffix}`)
    loadB = await mkLoad(T1, customerB, `ISO-B-${suffix}`)

    const t2c = await db.query<{ id: string }>(
      `INSERT INTO hub.customers (carrier_id, name, type) VALUES ($1, $2, 'broker') RETURNING id`,
      [tenant2, `IsoTest T2 Broker ${suffix}`]
    )
    tenant2Load = await mkLoad(tenant2, t2c[0].id, `ISO-T2-${suffix}`)

    // A document on customer B's load — broker A must never see it.
    await db.query(
      `INSERT INTO hub.documents (carrier_id, entity_type, entity_id, kind, file_name, storage, url)
       VALUES ($1, 'load', $2, 'pod', 'secret-pod-b.pdf', 'local', '/api/hub/files/none')`,
      [T1, loadB]
    )
    // An invoice for customer B — broker A must never see it.
    await db.query(
      `INSERT INTO hub.invoices (carrier_id, number, customer_id, load_id, amount_cents, issued_on, due_on, status)
       VALUES ($1, $2, $3, $4, 110000, CURRENT_DATE, CURRENT_DATE + 30, 'sent')`,
      [T1, `ISO-INV-${suffix}`, customerB, loadB]
    )
  })

  afterAll(async () => {
    // Clean up everything this suite created (FK-safe order).
    await db.query(`DELETE FROM hub.invoices WHERE number = $1`, [`ISO-INV-${suffix}`])
    await db.query(`DELETE FROM hub.documents WHERE file_name = 'secret-pod-b.pdf' AND entity_id = $1`, [loadB])
    await db.query(`DELETE FROM hub.load_events WHERE load_id IN ($1, $2, $3)`, [loadA, loadB, tenant2Load])
    await db.query(`DELETE FROM hub.stops WHERE load_id IN ($1, $2, $3)`, [loadA, loadB, tenant2Load])
    await db.query(`DELETE FROM hub.loads WHERE id IN ($1, $2, $3)`, [loadA, loadB, tenant2Load])
    await db.query(`DELETE FROM hub.customers WHERE name LIKE $1`, [`IsoTest%${suffix}`])
    await db.query(`DELETE FROM hub.carriers WHERE id = $1`, [tenant2])
    await db.hubDb().end()
    // @ts-expect-error reset the cached pool for any later suites
    global.__hubPool = undefined
  })

  it("a broker sees only their own customer's loads", async () => {
    const loads = await portal.portalLoads(T1, customerA, 200)
    const refs = loads.map((l) => l.reference)
    expect(refs).toContain(`ISO-A-${suffix}`)
    expect(refs).not.toContain(`ISO-B-${suffix}`)
    expect(refs).not.toContain(`ISO-T2-${suffix}`)
  })

  it("portal loads never expose money or driver fields", async () => {
    const loads = await portal.portalLoads(T1, customerA, 200)
    const mine = loads.find((l) => l.reference === `ISO-A-${suffix}`)!
    expect(mine).toBeDefined()
    const keys = Object.keys(mine)
    for (const forbidden of ["linehaul_cents", "fuel_surcharge_cents", "driver_id", "driver_name", "truck_id"]) {
      expect(keys).not.toContain(forbidden)
    }
  })

  it("a broker cannot fetch another customer's load by id", async () => {
    expect(await portal.portalLoad(T1, customerA, loadB)).toBeNull()
    expect(await portal.portalLoad(T1, customerA, tenant2Load)).toBeNull()
    const legit = await portal.portalLoad(T1, customerA, loadA)
    expect(legit?.reference).toBe(`ISO-A-${suffix}`)
    expect(legit?.stops).toHaveLength(2)
    expect(Object.keys(legit!)).not.toContain("truck_id")
    // Timeline stops are public-safe: no facility address, refs, or raw GPS.
    for (const forbidden of ["address", "facility", "lat", "lng", "pickup_number", "po_number", "notes"]) {
      expect(Object.keys(legit!.stops[0])).not.toContain(forbidden)
    }
  })

  it("a broker cannot fetch another customer's load documents", async () => {
    const stolen = await portal.portalLoadDocuments(T1, customerA, loadB)
    expect(stolen).toHaveLength(0)
    const legit = await portal.portalLoadDocuments(T1, customerB, loadB)
    expect(legit.length).toBeGreaterThan(0)
  })

  it("a broker cannot see another customer's invoices", async () => {
    const invoices = await portal.portalInvoices(T1, customerA)
    expect(invoices.map((i) => i.number)).not.toContain(`ISO-INV-${suffix}`)
    const own = await portal.portalInvoices(T1, customerB)
    expect(own.map((i) => i.number)).toContain(`ISO-INV-${suffix}`)
  })

  it("a load can never be assigned another tenant's driver", async () => {
    const loadboard = await import("../loadboard")
    const d = await db.query<{ id: string }>(
      `INSERT INTO hub.drivers (carrier_id, first_name, last_name) VALUES ($1, 'Iso', $2) RETURNING id`,
      [tenant2, `Driver ${suffix}`]
    )
    const t2Driver = d[0].id
    try {
      await expect(
        loadboard.patchLoadBoardField(T1, loadA, "driver_id", t2Driver, { id: null, name: null })
      ).rejects.toThrow(/not found/i)
      const rows = await db.query<{ driver_id: string | null }>(
        `SELECT driver_id FROM hub.loads WHERE id = $1`,
        [loadA]
      )
      expect(rows[0].driver_id).toBeNull()
    } finally {
      await db.query(`DELETE FROM hub.drivers WHERE id = $1`, [t2Driver])
    }
  })

  it("tenant 1 office queries never return tenant 2 loads (both directions)", async () => {
    const t1Loads = await loadsLib.listLoads(T1, { status: "all" })
    expect(t1Loads.map((l) => l.reference)).not.toContain(`ISO-T2-${suffix}`)
    const t2Loads = await loadsLib.listLoads(tenant2, { status: "all" })
    const t2Refs = t2Loads.map((l) => l.reference)
    expect(t2Refs).toContain(`ISO-T2-${suffix}`)
    expect(t2Refs).not.toContain(`ISO-A-${suffix}`)
  })
})
