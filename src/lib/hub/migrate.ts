/**
 * In-app migration runner — the same semantics as scripts/hub-migrate.mjs
 * (apply migrations/hub/*.sql in filename order, tracked in
 * public.hub_migrations, each file in its own transaction) but callable from
 * the deployed app, so production schema can never lag production code:
 * the migrate cron applies exactly the migrations that shipped with the
 * running deployment.
 *
 * An advisory lock serializes concurrent runs (cron fire + manual trigger).
 */
import { readFileSync, readdirSync } from "fs"
import path from "path"
import { hubDb } from "./db"

const MIGRATE_LOCK_KEY = 727001

export interface MigrateResult {
  applied: string[]
  skipped: number
}

export async function runMigrations(): Promise<MigrateResult> {
  const client = await hubDb().connect()
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATE_LOCK_KEY])
    try {
      await client.query(
        `CREATE TABLE IF NOT EXISTS public.hub_migrations (
           name TEXT PRIMARY KEY,
           applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      )
      const dir = path.join(process.cwd(), "migrations", "hub")
      const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
      const { rows } = await client.query("SELECT name FROM public.hub_migrations")
      const done = new Set(rows.map((r: { name: string }) => r.name))

      const applied: string[] = []
      for (const file of files) {
        if (done.has(file)) continue
        const sql = readFileSync(path.join(dir, file), "utf-8")
        await client.query("BEGIN")
        try {
          await client.query(sql)
          await client.query("INSERT INTO public.hub_migrations (name) VALUES ($1)", [file])
          await client.query("COMMIT")
          applied.push(file)
        } catch (err) {
          await client.query("ROLLBACK")
          throw new Error(
            `migration ${file} failed: ${err instanceof Error ? err.message : "unknown"}`
          )
        }
      }
      return { applied, skipped: files.length - applied.length }
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATE_LOCK_KEY])
    }
  } finally {
    client.release()
  }
}
