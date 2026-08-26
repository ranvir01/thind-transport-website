import { describe, expect, it } from "vitest"
import { isLegacySignature, recolorInk } from "../../../../scripts/fix-legacy-signatures.mjs"

/** Build an RGBA buffer of n pixels from [r,g,b,a] tuples (repeated). */
function pixels(...px: Array<[number, number, number, number]>): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length * 4)
  px.forEach(([r, g, b, a], i) => out.set([r, g, b, a], i * 4))
  return out
}

const LEGACY_INK: [number, number, number, number] = [244, 246, 248, 255] // pre-11f32b8 #F4F6F8
const CURRENT_INK: [number, number, number, number] = [0x16, 0x18, 0x1d, 255] // #16181D
const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0]

describe("isLegacySignature", () => {
  it("detects near-white ink on transparent background", () => {
    expect(isLegacySignature(pixels(TRANSPARENT, LEGACY_INK, LEGACY_INK, TRANSPARENT))).toBe(true)
  })

  it("detects antialiased legacy strokes (same color, partial alpha)", () => {
    expect(isLegacySignature(pixels(TRANSPARENT, [244, 246, 248, 90], LEGACY_INK))).toBe(true)
  })

  it("ignores current dark-ink signatures", () => {
    expect(isLegacySignature(pixels(TRANSPARENT, CURRENT_INK, CURRENT_INK))).toBe(false)
  })

  it("ignores blank canvases", () => {
    expect(isLegacySignature(pixels(TRANSPARENT, TRANSPARENT))).toBe(false)
  })

  it("ignores mixed strokes where dark ink dominates", () => {
    // e.g. a signature re-signed after the fix with a stray bright speckle
    expect(isLegacySignature(pixels(CURRENT_INK, CURRENT_INK, CURRENT_INK, LEGACY_INK))).toBe(false)
  })
})

describe("recolorInk", () => {
  it("recolors ink pixels to #16181D and preserves alpha + transparency", () => {
    const data = pixels(TRANSPARENT, LEGACY_INK, [244, 246, 248, 90])
    recolorInk(data)
    expect(Array.from(data)).toEqual([
      0, 0, 0, 0, // background untouched
      0x16, 0x18, 0x1d, 255, // full-alpha stroke recolored
      0x16, 0x18, 0x1d, 90, // antialiased edge keeps its alpha
    ])
  })

  it("round-trips: a recolored signature no longer reads as legacy", () => {
    const data = pixels(TRANSPARENT, LEGACY_INK, LEGACY_INK)
    expect(isLegacySignature(data)).toBe(true)
    recolorInk(data)
    expect(isLegacySignature(data)).toBe(false)
  })
})
