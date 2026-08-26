/**
 * Simulation world entrypoints.
 *
 *   npm run sim:seed    default seed "hauldesk-default"
 *   npm run sim:new     random seed (still internally coherent)
 *   npm run sim:reset   re-seed using the seed stored in hub.platform_state
 *
 * All three call scripts/seed-demo.mjs after setting HAULDESK_SIM_SEED.
 */
import { fileURLToPath } from "node:url"
import { randomBytes } from "node:crypto"
import { spawnSync } from "node:child_process"
import path from "node:path"
import pg from "pg"
import { loadEnvLocal } from "../env-local.mjs"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

function runSeed(seed) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "seed-demo.mjs")], {
    stdio: "inherit",
    env: { ...process.env, HAULDESK_SIM_SEED: seed, HAULDESK_MODE: "simulation" },
    cwd: ROOT,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

async function readStoredSeed() {
  loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL required")
  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT sim_seed FROM hub.platform_state WHERE id = 1`)
    return rows[0]?.sim_seed || "hauldesk-default"
  } finally {
    await client.end()
  }
}

const mode = process.argv[2] || "seed"

if (mode === "new") {
  const seed = `hauldesk-${randomBytes(4).toString("hex")}`
  console.log(`sim:new — generating world from seed ${seed}`)
  runSeed(seed)
} else if (mode === "reset") {
  const seed = await readStoredSeed()
  console.log(`sim:reset — replaying stored seed ${seed}`)
  runSeed(seed)
} else {
  const seed = process.env.HAULDESK_SIM_SEED || "hauldesk-default"
  console.log(`sim:seed — world from seed ${seed}`)
  runSeed(seed)
}
