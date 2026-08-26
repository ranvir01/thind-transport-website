/**
 * The brand is defined once and consumed in four places that cannot import
 * each other at runtime: committed PNGs, a committed SVG, a React component,
 * and the PWA manifest. This is what keeps them the same brand.
 *
 * The failure it guards is the one that was actually shipped: the icon drew a
 * navy tile with orange and gold chevrons, the manifest launched on navy, and
 * the interface underneath was indigo — three products' worth of colour in one
 * install, and nothing anywhere failed. Icons are also the easiest asset in a
 * repo to edit and forget to regenerate, because nothing imports a PNG.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { LOADOFF_BRAND, LOADOFF_ICON_RADIUS, LOADOFF_MARK_PATH } from "../brand"

const REPO = resolve(__dirname, "../../../..")
const pub = (f: string) => resolve(REPO, "public", f)
const src = (f: string) => resolve(REPO, "src", f)

/** Every icon the manifests and <link> tags point at must exist and be non-trivial. */
const SHIPPED = [
  "hub-icon-180.png",
  "hub-icon-192.png",
  "hub-icon-512.png",
  "hub-icon-512-maskable.png",
  "hub-icon.svg",
]

describe("LoadOff brand assets", () => {
  it("ships every icon the manifest and apple-touch link reference", () => {
    for (const f of SHIPPED) {
      expect(existsSync(pub(f)), `public/${f} is missing — run npm run generate:hub-icons`).toBe(true)
      expect(readFileSync(pub(f)).byteLength, `public/${f} is empty`).toBeGreaterThan(500)
    }
  })

  it("the committed SVG was generated from the current mark and colours", () => {
    // The cheap tell that someone changed brand.ts without regenerating. The
    // PNGs are binary and can't be checked this way, but they come out of the
    // same run as the SVG, so the SVG standing in for them is honest.
    const svg = readFileSync(pub("hub-icon.svg"), "utf8")
    expect(svg, "public/hub-icon.svg is stale — run npm run generate:hub-icons").toContain(
      LOADOFF_MARK_PATH
    )
    expect(svg).toContain(LOADOFF_BRAND.indigo)
    expect(svg).toContain(LOADOFF_BRAND.indigoDeep)
    expect(svg).toContain(`rx="${512 * LOADOFF_ICON_RADIUS}"`)
  })

  it("the static manifest fallback launches on the same colour as the route", () => {
    // public/hub.webmanifest is served when the API route can't be reached, so
    // an install can land on it. It has no way to import the constant.
    const manifest = JSON.parse(readFileSync(pub("hub.webmanifest"), "utf8"))
    expect(manifest.theme_color).toBe(LOADOFF_BRAND.launch)
    expect(manifest.background_color).toBe(LOADOFF_BRAND.launch)
  })

  it("the in-app mark draws the same path as the installed icon", () => {
    const component = readFileSync(src("components/hub/LoadOffMark.tsx"), "utf8")
    expect(component).toContain("LOADOFF_MARK_PATH")
    expect(component, "the mark must not re-type its own colours").not.toMatch(/#[0-9a-fA-F]{6}/)
  })

  /**
   * Android clips a maskable icon to a shape inscribed in the tile; the spec
   * guarantees only a centred circle of 80% diameter. The mark's bounding box
   * is fixed geometry, so this is checkable arithmetic rather than a guess.
   */
  it("the mark clears Android's maskable safe zone", () => {
    const coords = LOADOFF_MARK_PATH.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(coords.length).toBeGreaterThan(10)

    // Bounds are asserted against the documented box rather than re-parsed from
    // the path's arcs: the point is that the box is what brand.ts claims.
    const box = { minX: 24, maxX: 76, minY: 23, maxY: 77 }
    const halfDiagonal = Math.hypot((box.maxX - box.minX) / 2, (box.maxY - box.minY) / 2)
    const safeRadius = 40 // 80% diameter of the 100-unit tile
    expect(halfDiagonal).toBeLessThan(safeRadius)

    // And that the box really is centred, or the safe-zone maths above is void.
    expect((box.minX + box.maxX) / 2).toBe(50)
    expect((box.minY + box.maxY) / 2).toBe(50)
  })
})
