/**
 * Generates the LoadOff PWA icons from the shared mark in src/lib/hub/brand.ts.
 *
 * Three targets, three different treatments — they are not the same PNG at
 * different sizes:
 *
 *  - `purpose: "any"` (192, 512) is shown as authored, so it carries its own
 *    rounded corners.
 *  - `purpose: "maskable"` (512) is clipped by the launcher to whatever shape
 *    the device uses, so it must be a full-bleed square with the mark inside
 *    Android's safe-zone circle. Rounded corners here would be clipped twice.
 *  - the apple-touch icon (180) is masked by iOS into its own squircle. It must
 *    be full-bleed and fully opaque: iOS composites transparency onto black, so
 *    a pre-rounded tile installs with four black corners inside the mask.
 *
 * The icons are committed, so this only needs re-running when the mark or the
 * brand colours change. Node strips the types out of the .ts import natively.
 *
 * Usage: npm run generate:hub-icons
 */
import sharp from "sharp"
import { writeFileSync } from "node:fs"
import path from "node:path"
import {
  LOADOFF_BRAND,
  LOADOFF_ICON_RADIUS,
  LOADOFF_MARK_PATH,
  LOADOFF_MARK_SCALE,
} from "../src/lib/hub/brand.ts"

/**
 * @param {number} size
 * @param {"any" | "maskable" | "apple"} target
 */
function iconSvg(size, target) {
  const scale = LOADOFF_MARK_SCALE[target]
  const radius = target === "any" ? size * LOADOFF_ICON_RADIUS : 0
  // Scale about the centre: the mark is centred on (50,50) in its own box and
  // has to stay centred for the launcher masks to leave it intact.
  const offset = (size * (1 - scale)) / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="loadoff-bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${LOADOFF_BRAND.indigo}"/>
      <stop offset="1" stop-color="${LOADOFF_BRAND.indigoDeep}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#loadoff-bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${(size * scale) / 100})">
    <path d="${LOADOFF_MARK_PATH}" fill="${LOADOFF_BRAND.glyph}"/>
  </g>
</svg>`
}

const out = (name) => path.join(process.cwd(), "public", name)
const png = (svg) => sharp(Buffer.from(svg)).png()

await png(iconSvg(512, "any")).toFile(out("hub-icon-512.png"))
await png(iconSvg(192, "any")).toFile(out("hub-icon-192.png"))
await png(iconSvg(512, "maskable")).toFile(out("hub-icon-512-maskable.png"))
// iOS reads <link rel="apple-touch-icon"> before it ever looks at the manifest
// icons, so this file — not the 512 — is what a driver ends up staring at on
// their home screen. `flatten` guarantees opacity even if the mark ever grows a
// transparent region.
await png(iconSvg(180, "apple")).flatten({ background: LOADOFF_BRAND.indigoDeep }).toFile(out("hub-icon-180.png"))
writeFileSync(out("hub-icon.svg"), iconSvg(512, "any"))

console.log("LoadOff icons written to public/hub-icon-{180,192,512,512-maskable}.png + hub-icon.svg")
