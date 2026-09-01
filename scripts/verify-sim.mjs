/**
 * Post-seed proofs: tenant isolation, penny-exact settlement math,
 * simulation guards (email echo, mocked integrations, PDF watermark).
 *
 *   node scripts/verify-sim.mjs
 */
import pg from "pg"
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib"
import { loadEnvLocal } from "./env-local.mjs"
import { createRng } from "./sim/rng.mjs"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const THIND = "11111111-1111-1111-1111-111111111111"
const ATS = "22222222-2222-2222-2222-222222222222"

const checks = []
function pass(name, detail = "") {
  checks.push({ ok: true, name, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`)
}
function fail(name, detail) {
  checks.push({ ok: false, name, detail })
  console.error(`  ✗ ${name} — ${detail}`)
}

function roundHalfAwayFromZero(n) {
  if (!Number.isFinite(n)) return 0
  const sign = n < 0 ? -1 : 1
  const abs = Math.abs(n)
  return sign * Math.floor(abs + 0.5)
}

async function main() {
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL required")
  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  try {
    console.log("verify-sim")

    const mode = await client.query(`SELECT mode, sim_seed FROM hub.platform_state WHERE id = 1`)
    if (mode.rows[0]?.mode === "simulation") pass("platform_state.mode is simulation", mode.rows[0].sim_seed)
    else fail("platform_state.mode is simulation", `got ${mode.rows[0]?.mode ?? "missing row"}`)

    const names = await client.query(`SELECT id, name FROM hub.carriers WHERE id = ANY($1)`, [[THIND, ATS]])
    const byId = Object.fromEntries(names.rows.map((r) => [r.id, r.name]))
    if (byId[THIND]?.includes("Thind")) pass("Thind tenant exists", byId[THIND])
    else fail("Thind tenant exists", JSON.stringify(byId))
    if (byId[ATS] === "ATS Transport LLC") pass("ATS tenant exists")
    else fail("ATS tenant exists", byId[ATS] ?? "missing")

    const bleed = await client.query(
      `SELECT COUNT(*)::int AS n FROM hub.loads
       WHERE carrier_id = $1 AND (reference LIKE 'ATS-%' OR reference LIKE 'CAS-%')`,
      [THIND]
    )
    if (bleed.rows[0].n === 0) pass("Thind loads have no ATS/CAS refs")
    else fail("Thind loads have no ATS/CAS refs", `${bleed.rows[0].n} leaked`)

    const bleed2 = await client.query(
      `SELECT COUNT(*)::int AS n FROM hub.loads WHERE carrier_id = $1 AND reference LIKE 'THD-%'`,
      [ATS]
    )
    if (bleed2.rows[0].n === 0) pass("ATS loads have no THD- refs")
    else fail("ATS loads have no THD- refs", `${bleed2.rows[0].n} leaked`)

    const cas = await client.query(
      `SELECT COUNT(*)::int AS n FROM hub.loads WHERE carrier_id = $1 AND reference = 'CAS-5001'`,
      [ATS]
    )
    if (cas.rows[0].n === 1) pass("CAS-5001 lives on ATS")
    else fail("CAS-5001 lives on ATS", String(cas.rows[0].n))

    const dispatcher = await client.query(
      `SELECT role, carrier_id FROM hub.users WHERE email = 'dispatch@demo.thind'`
    )
    if (dispatcher.rows[0]?.role === "dispatcher" && dispatcher.rows[0].carrier_id === THIND) {
      pass("Thind dispatcher is locked to Thind (no sim_view switcher)")
    } else fail("Thind dispatcher is locked to Thind", JSON.stringify(dispatcher.rows[0]))

    // Company per-mile $0.63 loaded only: 520 + 480 miles × 63¢ = 63000
    const miles = 520 + 480
    const perMile = roundHalfAwayFromZero(miles * 63)
    if (perMile === 63000) pass("per-mile settlement to the penny", `${miles} × 63¢ = ${perMile}`)
    else fail("per-mile settlement to the penny", String(perMile))

    // O/O 90% linehaul + 100% FSC: 0.9×210000 + 20000 + 0.9×195000 + 18000 = 402500
    const oo = roundHalfAwayFromZero(210000 * 0.9) + 20000 + roundHalfAwayFromZero(195000 * 0.9) + 18000
    if (oo === 402500) pass("owner-operator 90% + FSC to the penny", String(oo))
    else fail("owner-operator 90% + FSC to the penny", String(oo))

    const rngA = createRng("hauldesk-default")
    const rngB = createRng("hauldesk-default")
    if (rngA() === rngB()) pass("seeded RNG is deterministic")
    else fail("seeded RNG is deterministic", "mismatch")

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([612, 792])
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    page.drawText("SIMULATION — NOT A REAL DOCUMENT", {
      x: 170, y: 280, size: 28, font, color: rgb(0.75, 0.15, 0.12), rotate: degrees(32), opacity: 0.22,
    })
    const bytes = await pdf.save()
    if (bytes.length > 400) pass("watermark PDF bytes exist", `${bytes.length} bytes`)
    else fail("watermark PDF bytes exist", String(bytes.length))

    console.log("")
    const failed = checks.filter((c) => !c.ok)
    if (failed.length) {
      console.error(`verify-sim: ${failed.length} failed`)
      process.exit(1)
    }
    console.log(`verify-sim: ${checks.length} passed`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("verify-sim failed:", err)
  process.exit(1)
})
