/**
 * Generates the HaulDesk PWA icons (product-branded, carrier-neutral).
 * Renders a simple "HD" monogram lockup on the navy product background.
 *
 * Usage: node scripts/generate-hub-icons.mjs
 */
import sharp from "sharp"
import { writeFileSync } from "node:fs"
import path from "node:path"

const NAVY = "#0E1621"
const ORANGE = "#E8650D"
const GOLD = "#D9A441"

function iconSvg(size, { padded = false } = {}) {
  // Maskable icons need ~20% safe zone padding.
  const scale = padded ? 0.72 : 0.92
  const s = size * scale
  const off = (size - s) / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${padded ? 0 : size * 0.18}" fill="${NAVY}"/>
  <g transform="translate(${off}, ${off}) scale(${s / 100})">
    <!-- road chevron -->
    <path d="M14 78 L42 22 L50 22 L26 78 Z" fill="${ORANGE}"/>
    <path d="M34 78 L62 22 L70 22 L46 78 Z" fill="${GOLD}"/>
    <!-- desk line -->
    <rect x="54" y="64" width="34" height="8" rx="3" fill="#FFFFFF"/>
    <rect x="62" y="46" width="26" height="8" rx="3" fill="#FFFFFF" opacity="0.75"/>
    <rect x="70" y="28" width="18" height="8" rx="3" fill="#FFFFFF" opacity="0.5"/>
  </g>
</svg>`
}

const out = (name) => path.join(process.cwd(), "public", name)

await sharp(Buffer.from(iconSvg(512))).png().toFile(out("hub-icon-512.png"))
await sharp(Buffer.from(iconSvg(192))).png().toFile(out("hub-icon-192.png"))
await sharp(Buffer.from(iconSvg(512, { padded: true }))).png().toFile(out("hub-icon-512-maskable.png"))
writeFileSync(out("hub-icon.svg"), iconSvg(512))

console.log("HaulDesk hub icons written to public/hub-icon-{192,512,512-maskable}.png + hub-icon.svg")
