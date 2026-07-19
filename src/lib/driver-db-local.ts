/**
 * Local-Postgres adapter for the legacy driver portal.
 *
 * The legacy driver flow once used `@vercel/postgres`, which speaks the Neon
 * serverless protocol and rejects plain TCP connection strings — it could
 * never run against the local rig (postgres://…@localhost). Everything now
 * goes through node-postgres pools: when POSTGRES_URL points at a local
 * server, `driver-db-postgres.ts` routes through this pool with
 * `search_path=public` so unqualified tables never collide with hub.*;
 * otherwise it shares the hub pool.
 */
import { Pool } from "pg"
import { hubDb } from "./hub/db"

declare global {
  var __driverDbPool: Pool | undefined
}

export function isLocalPostgresUrl(url: string | undefined): boolean {
  return /localhost|127\.0\.0\.1/.test(url || "")
}

function localPool(): Pool {
  // Reuse the pool across hot reloads in dev and across invocations in prod.
  if (!global.__driverDbPool) {
    // Legacy driver tables are unqualified and live in public. Pin search_path:
    // connecting as user "hub" would otherwise resolve them into the hub schema
    // ("$user" precedes public in the default search_path). Local-only pool, so
    // startup parameters are safe (Neon pooled URLs reject them).
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      options: "-c search_path=public",
      max: 3,
    })
    pool.on("error", (err) => console.error("Driver pool error:", err.message))
    global.__driverDbPool = pool
  }
  return global.__driverDbPool
}

/** Pool for legacy public.drivers / public.applications — local TCP uses search_path=public. */
export function driverDbPool(): Pool {
  return isLocalPostgresUrl(process.env.POSTGRES_URL) ? localPool() : hubDb()
}

