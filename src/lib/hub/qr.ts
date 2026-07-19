/**
 * Dependency-free QR encoder — byte mode, error-correction level M,
 * versions 1–10 (up to 213 bytes; plenty for any hub URL). Ported from the
 * ISO/IEC 18004 procedure: bit stream → Reed-Solomon blocks → interleave →
 * module placement → best-penalty mask. The round-trip test decodes the
 * output with a real reader (jsQR), so any regression here fails loudly.
 *
 * Server-safe and pure: no DOM, no canvas — callers render the boolean
 * matrix themselves (see qrSvgPath + QrCode).
 */

// ---------------------------------------------------------------- GF(256)

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

/** Generator polynomial for `ecCount` error-correction codewords. */
function rsGenerator(ecCount: number): number[] {
  let poly = [1]
  for (let i = 0; i < ecCount; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

function rsRemainder(data: number[], ecCount: number): number[] {
  const gen = rsGenerator(ecCount)
  const res = data.concat(new Array<number>(ecCount).fill(0))
  for (let i = 0; i < data.length; i++) {
    const factor = res[i]
    if (factor === 0) continue
    for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], factor)
  }
  return res.slice(data.length)
}

// ------------------------------------------------- version tables (ECC M)

/** Per version 1–10 at level M: EC codewords per block + data length of each block. */
const EC_BLOCKS_M: { ec: number; blocks: number[] }[] = [
  { ec: 10, blocks: [16] },
  { ec: 16, blocks: [28] },
  { ec: 26, blocks: [44] },
  { ec: 18, blocks: [32, 32] },
  { ec: 24, blocks: [43, 43] },
  { ec: 16, blocks: [27, 27, 27, 27] },
  { ec: 18, blocks: [31, 31, 31, 31] },
  { ec: 22, blocks: [38, 38, 39, 39] },
  { ec: 22, blocks: [36, 36, 36, 37, 37] },
  { ec: 26, blocks: [43, 43, 43, 43, 44] },
]

const ALIGNMENT: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
]

function dataCapacityBytes(version: number): number {
  return EC_BLOCKS_M[version - 1].blocks.reduce((a, b) => a + b, 0)
}

function charCountBits(version: number): number {
  return version <= 9 ? 8 : 16 // byte mode
}

// ------------------------------------------------------------- bit buffer

class BitBuffer {
  bits: number[] = []
  push(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1)
  }
  toBytes(): number[] {
    const out: number[] = []
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ?? 0)
      out.push(b)
    }
    return out
  }
}

/** Bit stream → padded data codewords → per-block RS → interleaved bytes. */
function buildCodewords(bytes: Uint8Array, version: number): number[] {
  const { ec, blocks } = EC_BLOCKS_M[version - 1]
  const capacity = dataCapacityBytes(version)

  const buf = new BitBuffer()
  buf.push(0b0100, 4) // byte mode
  buf.push(bytes.length, charCountBits(version))
  for (const b of bytes) buf.push(b, 8)
  // Terminator (up to 4 zero bits), then pad to a byte boundary.
  buf.push(0, Math.min(4, capacity * 8 - buf.bits.length))
  if (buf.bits.length % 8 !== 0) buf.push(0, 8 - (buf.bits.length % 8))
  const data = buf.toBytes()
  for (let pad = 0xec; data.length < capacity; pad ^= 0xec ^ 0x11) data.push(pad)

  // Split into blocks, compute EC for each.
  const dataBlocks: number[][] = []
  const ecBlocks: number[][] = []
  let offset = 0
  for (const len of blocks) {
    const block = data.slice(offset, offset + len)
    offset += len
    dataBlocks.push(block)
    ecBlocks.push(rsRemainder(block, ec))
  }

  // Interleave data codewords column-first, then EC codewords.
  const out: number[] = []
  const maxData = Math.max(...blocks)
  for (let i = 0; i < maxData; i++)
    for (const block of dataBlocks) if (i < block.length) out.push(block[i])
  for (let i = 0; i < ec; i++) for (const block of ecBlocks) out.push(block[i])
  return out
}

// --------------------------------------------------------- BCH (format/version)

function bchDigit(v: number): number {
  let digit = 0
  while (v !== 0) {
    digit++
    v >>>= 1
  }
  return digit
}

const G15 = 0b101_0011_0111
const G18 = 0b1_1111_0010_0101
const G15_MASK = 0b101_0100_0001_0010

function formatBits(mask: number): number {
  const data = mask // EC level M = 0b00, so the 5 data bits are just the mask
  let d = data << 10
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15))
  return ((data << 10) | d) ^ G15_MASK
}

function versionBits(version: number): number {
  let d = version << 12
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18))
  return (version << 12) | d
}

// ------------------------------------------------------------- matrix build

type Module = boolean | null

function placeFinder(m: Module[][], row: number, col: number): void {
  const size = m.length
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      if (row + r < 0 || size <= row + r || col + c < 0 || size <= col + c) continue
      const dark =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      m[row + r][col + c] = dark
    }
  }
}

function maskAt(pattern: number, r: number, c: number): boolean {
  switch (pattern) {
    case 0: return (r + c) % 2 === 0
    case 1: return r % 2 === 0
    case 2: return c % 3 === 0
    case 3: return (r + c) % 3 === 0
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    default: return (((r * c) % 3) + ((r + c) % 2)) % 2 === 0
  }
}

function buildMatrix(version: number, codewords: number[], mask: number): boolean[][] {
  const size = 17 + 4 * version
  const m: Module[][] = Array.from({ length: size }, () => new Array<Module>(size).fill(null))

  placeFinder(m, 0, 0)
  placeFinder(m, size - 7, 0)
  placeFinder(m, 0, size - 7)

  for (const row of ALIGNMENT[version - 1]) {
    for (const col of ALIGNMENT[version - 1]) {
      if (m[row][col] !== null) continue // overlaps a finder corner
      for (let r = -2; r <= 2; r++)
        for (let c = -2; c <= 2; c++)
          m[row + r][col + c] = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (m[i][6] === null) m[i][6] = i % 2 === 0
    if (m[6][i] === null) m[6][i] = i % 2 === 0
  }

  // Format info (both copies) + the always-dark module.
  const fmt = formatBits(mask)
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >> i) & 1) === 1
    if (i < 6) m[i][8] = bit
    else if (i < 8) m[i + 1][8] = bit
    else m[size - 15 + i][8] = bit
    if (i < 8) m[8][size - i - 1] = bit
    else if (i < 9) m[8][15 - i] = bit
    else m[8][15 - i - 1] = bit
  }
  m[size - 8][8] = true

  if (version >= 7) {
    const ver = versionBits(version)
    for (let i = 0; i < 18; i++) {
      const bit = ((ver >> i) & 1) === 1
      m[Math.floor(i / 3)][(i % 3) + size - 11] = bit
      m[(i % 3) + size - 11][Math.floor(i / 3)] = bit
    }
  }

  // Zigzag data placement from the bottom-right, two columns at a time,
  // skipping the vertical timing column.
  let inc = -1
  let row = size - 1
  let bitIndex = 7
  let byteIndex = 0
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (m[row][col - c] !== null) continue
        let dark = false
        if (byteIndex < codewords.length) dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1
        if (maskAt(mask, row, col - c)) dark = !dark
        m[row][col - c] = dark
        bitIndex--
        if (bitIndex === -1) {
          byteIndex++
          bitIndex = 7
        }
      }
      row += inc
      if (row < 0 || size <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
  }

  return m as boolean[][]
}

// ---------------------------------------------------------- mask selection

function penalty(m: boolean[][]): number {
  const size = m.length
  let score = 0

  // Rule 1: runs of ≥5 same-colored modules in a row/column.
  for (let axis = 0; axis < 2; axis++) {
    for (let i = 0; i < size; i++) {
      let run = 1
      for (let j = 1; j < size; j++) {
        const cur = axis === 0 ? m[i][j] : m[j][i]
        const prev = axis === 0 ? m[i][j - 1] : m[j - 1][i]
        if (cur === prev) {
          run++
          if (j === size - 1 && run >= 5) score += 3 + run - 5
        } else {
          if (run >= 5) score += 3 + run - 5
          run = 1
        }
      }
    }
  }

  // Rule 2: 2×2 blocks of one color.
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) score += 3

  // Rule 3: finder-like 1011101 with 0000 on either side, rows and columns.
  const isPattern = (get: (k: number) => boolean | undefined, start: number): boolean => {
    const core = [true, false, true, true, true, false, true]
    for (let k = 0; k < 7; k++) if (get(start + k) !== core[k]) return false
    const lightBefore = [-4, -3, -2, -1].every((k) => get(start + k) === false)
    const lightAfter = [7, 8, 9, 10].every((k) => get(start + k) === false)
    return lightBefore || lightAfter
  }
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - 7; j++) {
      if (isPattern((k) => (k >= 0 && k < size ? m[i][k] : undefined), j)) score += 40
      if (isPattern((k) => (k >= 0 && k < size ? m[k][i] : undefined), j)) score += 40
    }
  }

  // Rule 4: dark-module ratio deviation from 50%.
  let dark = 0
  for (const rowArr of m) for (const cell of rowArr) if (cell) dark++
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10

  return score
}

// ------------------------------------------------------------------ public

/** Encode text as a QR module matrix (true = dark). Throws if it can't fit v10-M. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  let version = 0
  for (let v = 1; v <= 10; v++) {
    const bitsNeeded = 4 + charCountBits(v) + bytes.length * 8
    if (bitsNeeded <= dataCapacityBytes(v) * 8) {
      version = v
      break
    }
  }
  if (version === 0) throw new Error(`QR: input too long (${bytes.length} bytes, max 213)`)

  const codewords = buildCodewords(bytes, version)
  let best: boolean[][] | null = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const candidate = buildMatrix(version, codewords, mask)
    const score = penalty(candidate)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best as boolean[][]
}

/** SVG path for the dark modules, offset by `quiet` modules of quiet zone. */
export function qrSvgPath(matrix: boolean[][], quiet = 4): string {
  const parts: string[] = []
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix.length; c++)
      if (matrix[r][c]) parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`)
  return parts.join("")
}
