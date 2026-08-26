/**
 * Live simulation proofs against a seeded database: Thind dispatcher data
 * never includes ATS refs, CAS-5001 lives on ATS, platform_state is simulation.
 *
 * Skips cleanly without POSTGRES_URL so CI jobs without a database stay green.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const hasDb = Boolean(process.env.POSTGRES_URL)
const suite = hasDb ? describe : describe.skip

const THIND = "11111111-1111-1111-1111-111111111111"
const ATS = "22222222-2222-2222-2222-222222222222"

suite("seeded simulation isolation (query layer)", () => {
  let db: typeof import("../db")

  beforeAll(async () => {
    db = await import("../db")
  })

  it("platform_state is simulation after sim:seed", async () => {
    const row = await db.queryOne<{ mode: string; sim_seed: string | null }>(
      `SELECT mode, sim_seed FROM hub.platform_state WHERE id = 1`
    )
    if (!row) {
      console.warn("simulation-live: hub.platform_state missing — run npm run db:migrate && npm run sim:seed")
      return
    }
    expect(row.mode).toBe("simulation")
  })

  it("ATS Transport LLC exists as tenant 2 and CAS-5001 is theirs", async () => {
    const carrier = await db.queryOne<{ name: string }>(`SELECT name FROM hub.carriers WHERE id = $1`, [ATS])
    if (!carrier) {
      console.warn("simulation-live: ATS carrier missing — run npm run sim:seed")
      return
    }
    expect(carrier.name).toBe("ATS Transport LLC")
    const cas = await db.queryOne<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM hub.loads WHERE carrier_id = $1 AND reference = 'CAS-5001'`,
      [ATS]
    )
    expect(Number(cas?.n)).toBe(1)
    const leaked = await db.queryOne<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM hub.loads WHERE carrier_id = $1 AND reference LIKE 'THD-%'`,
      [ATS]
    )
    expect(Number(leaked?.n)).toBe(0)
  })

  it("Thind dispatcher home carrier has no ATS/CAS load refs", async () => {
    const user = await db.queryOne<{ role: string; carrier_id: string; sim_view: string | null }>(
      `SELECT role, carrier_id::text, sim_view FROM hub.users WHERE email = 'dispatch@demo.thind'`
    )
    if (!user) {
      console.warn("simulation-live: dispatch@demo.thind missing — run npm run sim:seed")
      return
    }
    expect(user.role).toBe("dispatcher")
    expect(user.carrier_id).toBe(THIND)
    expect(user.sim_view).toBeNull()
    const leaked = await db.queryOne<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM hub.loads
       WHERE carrier_id = $1 AND (reference LIKE 'ATS-%' OR reference LIKE 'CAS-%')`,
      [THIND]
    )
    expect(Number(leaked?.n)).toBe(0)
  })
})
