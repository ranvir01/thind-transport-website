import { describe, expect, it } from "vitest"
import jsQR from "jsqr"
import { qrMatrix, qrSvgPath } from "../qr"

/** Rasterize a module matrix to RGBA pixels and decode with a real reader. */
function decode(matrix: boolean[][], scale = 4): string | null {
  const quiet = 4
  const size = (matrix.length + quiet * 2) * scale
  const data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.floor(y / scale) - quiet
      const c = Math.floor(x / scale) - quiet
      const dark = r >= 0 && c >= 0 && r < matrix.length && c < matrix.length && matrix[r][c]
      const v = dark ? 0 : 255
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return jsQR(data, size, size)?.data ?? null
}

describe("qrMatrix", () => {
  it("round-trips a typical hub URL through a real decoder", () => {
    const url = "https://thindtransport.com/hub/settings/app"
    expect(decode(qrMatrix(url))).toBe(url)
  })

  it("round-trips every version in range (1 through 10)", () => {
    // Byte capacities at ECC M force specific versions; cover each once.
    const lengths = [10, 20, 40, 60, 80, 100, 120, 150, 180, 210]
    for (const len of lengths) {
      const text = "x".repeat(len)
      expect(decode(qrMatrix(text)), `len=${len}`).toBe(text)
    }
  })

  it("round-trips non-ASCII content as UTF-8", () => {
    const text = "ਥਿੰਡ ਟਰਾਂਸਪੋਰਟ — Kent, WA"
    expect(decode(qrMatrix(text))).toBe(text)
  })

  it("picks the smallest fitting version", () => {
    expect(qrMatrix("A").length).toBe(21) // version 1
    expect(qrMatrix("x".repeat(50)).length).toBe(33) // version 4
  })

  it("is deterministic", () => {
    expect(qrMatrix("https://thindtransport.com/hub")).toEqual(qrMatrix("https://thindtransport.com/hub"))
  })

  it("rejects input beyond version 10 capacity", () => {
    expect(() => qrMatrix("x".repeat(300))).toThrow(/too long/)
  })

  it("has finder patterns in three corners", () => {
    const m = qrMatrix("finder check")
    const n = m.length
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      expect(m[r0][c0]).toBe(true) // outer ring corner
      expect(m[r0 + 3][c0 + 3]).toBe(true) // center
      expect(m[r0 + 1][c0 + 1]).toBe(false) // inner separator ring
    }
  })
})

describe("qrSvgPath", () => {
  it("emits one square per dark module, offset by the quiet zone", () => {
    const m = [
      [true, false],
      [false, true],
    ]
    expect(qrSvgPath(m, 4)).toBe("M4 4h1v1h-1zM5 5h1v1h-1z")
  })
})
