/**
 * TOTP against the RFCs' own numbers — the reason this module can be
 * dependency-free. HOTP vectors from RFC 4226 Appendix D; TOTP vectors from
 * RFC 6238 Appendix B (SHA-1 rows, truncated from 8 to our 6 digits by
 * dropping the leading two, which is how the truncation math composes).
 */
import { describe, expect, it } from "vitest"
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  looksLikeRecoveryCode,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from "../totp"

// RFC 4226/6238 shared test secret: ASCII "12345678901234567890".
const RFC_SECRET = Buffer.from("12345678901234567890", "ascii")
const RFC_SECRET_B32 = base32Encode(RFC_SECRET) // GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ

describe("base32", () => {
  it("round-trips the RFC secret", () => {
    expect(RFC_SECRET_B32).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")
    expect(base32Decode(RFC_SECRET_B32)).toEqual(RFC_SECRET)
  })

  it("tolerates lowercase, spaces and padding; rejects junk", () => {
    expect(base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq")).toEqual(RFC_SECRET)
    expect(() => base32Decode("not!base32")).toThrow()
  })
})

describe("hotp — RFC 4226 Appendix D vectors", () => {
  const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]
  it.each(expected.map((code, counter) => [counter, code]))("counter %i → %s", (counter, code) => {
    expect(hotp(RFC_SECRET, counter as number)).toBe(code)
  })
})

describe("totp — RFC 6238 Appendix B (SHA-1 rows, last 6 digits)", () => {
  const vectors: [number, string][] = [
    [59_000, "287082"], // T=59s → 94287082
    [1_111_111_109_000, "081804"], // → 07081804
    [1_111_111_111_000, "050471"], // → 14050471
    [1_234_567_890_000, "005924"], // → 89005924
    [2_000_000_000_000, "279037"], // → 69279037
  ]
  it.each(vectors)("at %ims → %s", (nowMs, code) => {
    expect(totpCode(RFC_SECRET_B32, nowMs)).toBe(code)
  })
})

describe("verifyTotp", () => {
  const NOW = 1_234_567_890_000

  it("accepts the current code and both adjacent steps (clock skew)", () => {
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, NOW), NOW)).toBe(true)
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, NOW - 30_000), NOW)).toBe(true)
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, NOW + 30_000), NOW)).toBe(true)
  })

  it("rejects a two-steps-old code, wrong codes, and malformed input", () => {
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, NOW - 90_000), NOW)).toBe(false)
    expect(verifyTotp(RFC_SECRET_B32, "000000", NOW)).toBe(false)
    expect(verifyTotp(RFC_SECRET_B32, "12345", NOW)).toBe(false)
    expect(verifyTotp(RFC_SECRET_B32, "abcdef", NOW)).toBe(false)
  })

  it("accepts a code typed with a space, as phones display them", () => {
    const code = totpCode(RFC_SECRET_B32, NOW)
    expect(verifyTotp(RFC_SECRET_B32, `${code.slice(0, 3)} ${code.slice(3)}`, NOW)).toBe(true)
  })
})

describe("secrets, URLs, recovery codes", () => {
  it("generates 160-bit base32 secrets", () => {
    const s = generateTotpSecret()
    expect(s).toMatch(/^[A-Z2-7]{32}$/)
    expect(base32Decode(s)).toHaveLength(20)
    expect(generateTotpSecret()).not.toBe(s)
  })

  it("otpauth URL carries issuer twice and the interop parameters", () => {
    const url = otpauthUrl("ABC234", "owner@thind.com", "LoadOff")
    expect(url).toBe(
      "otpauth://totp/LoadOff:owner%40thind.com?secret=ABC234&issuer=LoadOff&algorithm=SHA1&digits=6&period=30"
    )
  })

  it("recovery codes: unambiguous alphabet, hash normalizes case and dashes", () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
    for (const c of codes) {
      expect(c).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/)
      expect(looksLikeRecoveryCode(c)).toBe(true)
      expect(hashRecoveryCode(c)).toBe(hashRecoveryCode(c.toLowerCase().replace("-", "")))
    }
    expect(looksLikeRecoveryCode("123456")).toBe(false)
  })
})
