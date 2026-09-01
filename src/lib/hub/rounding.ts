/** Money rounding primitive shared by the money and pay-rules engines. */

/** Round half away from zero to an integer (money rounding). */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}
