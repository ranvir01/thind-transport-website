/**
 * Generates the LoadOff PWA icons (product-branded, carrier-neutral).
 * Renders a simple "load set down" mark on the navy product background.
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
    <!-- road chevrons: the miles -->
    <path d="M10 78 L38 22 L46 22 L22 78 Z" fill="${ORANGE}"/>
    <path d="M30 78 L58 22 L66 22 L42 78 Z" fill="${GOLD}"/>
    <!-- the load, set down: box dropping onto the ground line -->
    <rect x="62" y="26" width="24" height="20" rx="4" fill="#FFFFFF" opacity="0.9"/>
    <path d="M74 52 L74 62 M66 58 L74 68 L82 58" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="56" y="74" width="36" height="7" rx="3.5" fill="#FFFFFF"/>
  </g>
</svg>`
}

const out = (name) => path.join(process.cwd(), "public", name)

await sharp(Buffer.from(iconSvg(512))).png().toFile(out("hub-icon-512.png"))
await sharp(Buffer.from(iconSvg(192))).png().toFile(out("hub-icon-192.png"))
await sharp(Buffer.from(iconSvg(512, { padded: true }))).png().toFile(out("hub-icon-512-maskable.png"))
writeFileSync(out("hub-icon.svg"), iconSvg(512))

console.log("LoadOff hub icons written to public/hub-icon-{192,512,512-maskable}.png + hub-icon.svg")
