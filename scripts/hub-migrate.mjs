/**
 * Hub migration runner. Applies migrations/hub/*.sql in filename order,
 * tracking applied files in hub_migrations (public schema). Idempotent.
 *
 * Usage: POSTGRES_URL=... node scripts/hub-migrate.mjs
 * (reads .env.local automatically when POSTGRES_URL is unset)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
import path from "node:path"
import pg from "pg"

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) {
    // --if-db: the Vercel buildCommand runs migrations before every build so
    // production schema can never lag production code; environments without a
    // database (CI, forks) must still build.
    if (process.argv.includes("--if-db")) {
      console.log("No POSTGRES_URL — skipping migrations (--if-db).")
      return
    }
    console.error("POSTGRES_URL is required (set it in the environment or .env.local)")
    process.exit(1)
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()

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
    const applied = new Set(rows.map((r) => r.name))

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`= ${file} (already applied)`)
        continue
      }
      const sql = readFileSync(path.join(dir, file), "utf-8")
      console.log(`> applying ${file} ...`)
      await client.query("BEGIN")
      try {
        await client.query(sql)
        await client.query("INSERT INTO public.hub_migrations (name) VALUES ($1)", [file])
        await client.query("COMMIT")
        console.log(`✓ ${file}`)
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      }
    }
    console.log("Migrations complete.")
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message)
  process.exit(1)
})
