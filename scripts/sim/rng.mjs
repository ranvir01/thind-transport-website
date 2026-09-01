/**
 * Seeded PRNG for HaulDesk simulation worlds.
 * Same seed string → same sequence. Not cryptographic.
 */
export function createRng(seedStr = "hauldesk-default") {
  let h = 2166136261
  const text = String(seedStr)
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
