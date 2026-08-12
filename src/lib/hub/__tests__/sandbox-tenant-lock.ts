/**
 * Mutual exclusion for the DB-backed suites that share the sandbox tenant.
 *
 * `tickSandboxSim` and `seedSandbox` are hard-wired to one carrier id, so
 * every live suite necessarily works on the same rows — and vitest runs test
 * FILES in parallel workers. The live-simulation suite reseeding that tenant
 * mid-way through the concurrency suite's fixture is not a race the product
 * has; it is one the test runner invents, and it shows up as a baffling
 * "expected 1 to be greater than 1".
 *
 * A session-level advisory lock held on a dedicated connection serializes
 * them no matter how vitest schedules the files. It must be a pinned client:
 * the `query()` helper hands out a different pooled connection per call, and
 * a session lock taken on one of those would be released the moment that
 * connection went back to the pool.
 *
 * Key is distinct from the seed's own `loadoff-sandbox-seed` xact lock, so
 * this never deadlocks against the seeding it wraps.
 */
import type { PoolClient } from "pg"

const KEY = "loadoff-test-sandbox-tenant"

export async function lockSandboxTenant(): Promise<PoolClient> {
  const { hubDb } = await import("../db")
  const client = await hubDb().connect()
  await client.query(`SELECT pg_advisory_lock(hashtext($1))`, [KEY])
  return client
}

export async function unlockSandboxTenant(client: PoolClient | null): Promise<void> {
  if (!client) return
  try {
    await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [KEY])
  } finally {
    client.release()
  }
}
