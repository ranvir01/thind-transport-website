/**
 * Hub database client — node-postgres Pool against POSTGRES_URL.
 * Works with local Postgres, Vercel Postgres, and Neon (standard protocol).
 * All Hub tables live in the "hub" schema (search_path set per connection).
 */
import { Pool } from "pg"

declare global {
  var __hubPool: Pool | undefined
}

/** Drop sslmode= so node-pg stops warning that require/prefer alias verify-full. */
function connectionStringForPool(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete("sslmode")
    return parsed.toString()
  } catch {
    return url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "")
  }
}

function createPool(): Pool {
  const url = process.env.POSTGRES_URL
  if (!url) {
    throw new Error("POSTGRES_URL is not set — the Hub requires a Postgres database")
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(url)
  // Do not set search_path on the pool — Neon/Vercel pooled URLs reject startup
  // parameters. All Hub SQL uses fully qualified hub.* table names.
  const pool = new Pool({
    connectionString: connectionStringForPool(url),
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
  })
  pool.on("error", (err) => console.error("Hub pool error:", err.message))
  return pool
}

export function hubDb(): Pool {
  // Reuse the pool across hot reloads in dev and across invocations in prod.
  if (!global.__hubPool) {
    global.__hubPool = createPool()
  }
  return global.__hubPool
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await hubDb().query(text, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export function hubDbAvailable(): boolean {
  return Boolean(process.env.POSTGRES_URL)
}
