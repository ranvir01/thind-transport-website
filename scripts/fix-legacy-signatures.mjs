/**
 * One-off data repair: signatures captured BEFORE 11f32b8 were drawn with
 * near-white ink (#F4F6F8) on a transparent canvas. On white PDF pages and
 * light office surfaces those PNGs render invisible — a legal-record defect
 * (DVIR 396.11 signatures, signed offers, announcement acks).
 *
 * This script scans hub.dvirs / hub.offers / hub.announcement_acks for
 * PNG data-URL signatures whose ink is near-white and recolors the ink to
 * #16181D (the current SignaturePad ink), preserving stroke alpha and the
 * transparent background so repaired rows match post-fix captures exactly.
 * Idempotent: dark-ink signatures never match the legacy detector.
 *
 * Usage: node scripts/fix-legacy-signatures.mjs [--apply]
 *   (dry-run by default; reads POSTGRES_URL from env or .env.local)
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

// Legacy detector thresholds. Legacy ink was rgb(244,246,248); antialiasing
// varies alpha but not color, so any real legacy stroke is uniformly bright.
const NEAR_WHITE_MIN_CHANNEL = 200
const LEGACY_INK_RATIO = 0.9
const INK = { r: 0x16, g: 0x18, b: 0x1d } // #16181D — current pad ink

/** Ink pixels = alpha > 0. Legacy iff ≥90% of them are near-white. */
export function isLegacySignature(rgba) {
  let ink = 0
  let nearWhite = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue
    ink++
    if (
      rgba[i] >= NEAR_WHITE_MIN_CHANNEL &&
      rgba[i + 1] >= NEAR_WHITE_MIN_CHANNEL &&
      rgba[i + 2] >= NEAR_WHITE_MIN_CHANNEL
    ) {
      nearWhite++
    }
  }
  if (ink === 0) return false // blank canvas — nothing to repair
  return nearWhite / ink >= LEGACY_INK_RATIO
}

/** Recolor every ink pixel to #16181D in place, preserving alpha. */
export function recolorInk(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue
    rgba[i] = INK.r
    rgba[i + 1] = INK.g
    rgba[i + 2] = INK.b
  }
  return rgba
}

const PNG_PREFIX = "data:image/png;base64,"

/** data URL → repaired data URL, or null when the signature is not legacy. */
async function repairDataUrl(dataUrl, { createCanvas, loadImage }) {
  if (!dataUrl.startsWith(PNG_PREFIX)) return null // 'seeded' rows, other formats
  let image
  try {
    image = await loadImage(Buffer.from(dataUrl.slice(PNG_PREFIX.length), "base64"))
  } catch {
    return null // undecodable blob — leave untouched
  }
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, image.width, image.height)
  if (!isLegacySignature(imageData.data)) return null
  recolorInk(imageData.data)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

const TABLES = [
  { table: "hub.dvirs", pk: ["id"] },
  { table: "hub.offers", pk: ["id"] },
  { table: "hub.announcement_acks", pk: ["announcement_id", "user_id"] },
]

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
  const apply = process.argv.includes("--apply")
  const { createCanvas, loadImage } = await import("canvas")
  const { default: pg } = await import("pg")

  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) {
    console.error("POSTGRES_URL is required (set it in the environment or .env.local)")
    process.exit(1)
  }
  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()

  try {
    let totalRepaired = 0
    for (const { table, pk } of TABLES) {
      const pkCols = pk.join(", ")
      const rows = await client.query(
        `SELECT ${pkCols}, signature FROM ${table} WHERE signature LIKE '${PNG_PREFIX}%'`
      )
      let repaired = 0
      for (const row of rows.rows) {
        const fixed = await repairDataUrl(row.signature, { createCanvas, loadImage })
        if (!fixed) continue
        repaired++
        const where = pk.map((col, i) => `${col} = $${i + 2}`).join(" AND ")
        const key = pk.map((col) => row[col]).join("/")
        if (apply) {
          await client.query(`UPDATE ${table} SET signature = $1 WHERE ${where}`, [
            fixed,
            ...pk.map((col) => row[col]),
          ])
          console.log(`  fixed ${table} ${key}`)
        } else {
          console.log(`  would fix ${table} ${key}`)
        }
      }
      totalRepaired += repaired
      console.log(`${table}: ${rows.rows.length} PNG signature(s), ${repaired} legacy near-white`)
    }
    console.log(
      apply
        ? `Repaired ${totalRepaired} signature(s).`
        : `Dry run — ${totalRepaired} signature(s) need repair. Re-run with --apply to write.`
    )
  } finally {
    await client.end()
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
