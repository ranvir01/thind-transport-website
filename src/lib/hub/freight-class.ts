/**
 * LTL freight classification by density — the NMFTA density guideline table.
 *
 * A shipper who guesses the class wrong gets re-classed by the carrier and
 * eats the difference, which is where most LTL billing disputes come from. The
 * arithmetic is not hard; it is just tedious enough that people guess.
 *
 * IMPORTANT, and the reason every result carries a caveat: density is only the
 * first of the four characteristics the NMFC uses. Stowability, ease of
 * handling, and liability (value, fragility, hazard, theft appeal) can all move
 * an item off its density class, and many commodities carry a fixed NMFC item
 * number that ignores density entirely. This module answers "what does the
 * density table say", which is the right starting point and the wrong final
 * word. Anything moving under a specific NMFC item number goes by that number.
 */

/** Cubic inches in a cubic foot. */
const CUBIC_INCHES_PER_FOOT = 1_728

export interface Piece {
  /** Inches. Use the outside dimensions of the packaging, not the product. */
  lengthIn: number
  widthIn: number
  heightIn: number
  /** Pounds, gross — product plus pallet plus packaging. */
  weightLbs: number
  /** How many identical pieces like this. Defaults to 1. */
  quantity?: number
}

export interface FreightClassResult {
  /** The NMFC class the density table indicates. */
  freightClass: number
  /** Pounds per cubic foot, rounded to two decimals for display. */
  densityLbsPerCubicFoot: number
  /** Total cubic feet across every piece. */
  cubicFeet: number
  /** Total gross weight in pounds. */
  totalWeightLbs: number
  /** Total pieces counted (quantities expanded). */
  pieceCount: number
  /**
   * The density bracket this landed in, e.g. "12 to under 13.5 lb/ft³". Useful
   * for showing a shipper how close they are to the next class.
   */
  bracket: string
  /**
   * How many pounds would have to be added or removed to reach the next class
   * down (cheaper) at the same cube — null when already at class 50.
   */
  poundsToNextLowerClass: number | null
  caveat: string
}

/**
 * The NMFTA density guideline: 18 brackets from under 1 lb/ft³ (class 500) to
 * 50 lb/ft³ and up (class 50). Ordered densest first so the first match wins.
 * `minDensity` is inclusive — the table reads "50 or greater", "35 but less
 * than 50", and so on.
 */
const DENSITY_TABLE: { minDensity: number; freightClass: number }[] = [
  { minDensity: 50, freightClass: 50 },
  { minDensity: 35, freightClass: 55 },
  { minDensity: 30, freightClass: 60 },
  { minDensity: 22.5, freightClass: 65 },
  { minDensity: 15, freightClass: 70 },
  { minDensity: 13.5, freightClass: 77.5 },
  { minDensity: 12, freightClass: 85 },
  { minDensity: 10.5, freightClass: 92.5 },
  { minDensity: 9, freightClass: 100 },
  { minDensity: 8, freightClass: 110 },
  { minDensity: 7, freightClass: 125 },
  { minDensity: 6, freightClass: 150 },
  { minDensity: 5, freightClass: 175 },
  { minDensity: 4, freightClass: 200 },
  { minDensity: 3, freightClass: 250 },
  { minDensity: 2, freightClass: 300 },
  { minDensity: 1, freightClass: 400 },
  { minDensity: 0, freightClass: 500 },
]

/** Every class in the NMFTA density table, lightest freight first. */
export const FREIGHT_CLASSES = DENSITY_TABLE.map((row) => row.freightClass).slice().reverse()

const CAVEAT =
  "Density sets the starting class. Stowability, handling, and liability can move it, " +
  "and a commodity with its own NMFC item number goes by that number regardless of density. " +
  "Confirm with your carrier before the BOL goes out."

/** Cubic feet for one piece, from outside dimensions in inches. */
export function cubicFeet(piece: Piece): number {
  const { lengthIn, widthIn, heightIn } = piece
  for (const [name, value] of [["length", lengthIn], ["width", widthIn], ["height", heightIn]] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Piece ${name} must be a positive number of inches, got ${value}`)
    }
  }
  const quantity = piece.quantity ?? 1
  return (lengthIn * widthIn * heightIn * quantity) / CUBIC_INCHES_PER_FOOT
}

/** The density table lookup on its own, for a density you already have. */
export function freightClassFromDensity(densityLbsPerCubicFoot: number): number {
  if (!Number.isFinite(densityLbsPerCubicFoot) || densityLbsPerCubicFoot < 0) {
    throw new Error("Density must be a non-negative number")
  }
  return DENSITY_TABLE.find((row) => densityLbsPerCubicFoot >= row.minDensity)!.freightClass
}

function bracketLabel(density: number): string {
  const index = DENSITY_TABLE.findIndex((row) => density >= row.minDensity)
  const row = DENSITY_TABLE[index]
  const above = DENSITY_TABLE[index - 1]
  if (!above) return `${row.minDensity} lb/ft³ and over`
  if (row.minDensity === 0) return `under ${above.minDensity} lb/ft³`
  return `${row.minDensity} to under ${above.minDensity} lb/ft³`
}

/**
 * Classify a shipment of one or more pieces.
 *
 * Multiple pieces are summed, not averaged per piece: LTL density is computed
 * across the whole shipment, so three light pallets and one dense one produce
 * one class, not four.
 */
export function classifyShipment(pieces: Piece[]): FreightClassResult {
  if (pieces.length === 0) throw new Error("A shipment needs at least one piece")

  let totalCubicFeet = 0
  let totalWeightLbs = 0
  let pieceCount = 0

  for (const piece of pieces) {
    const quantity = piece.quantity ?? 1
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Piece quantity must be a positive whole number, got ${quantity}`)
    }
    if (!Number.isFinite(piece.weightLbs) || piece.weightLbs <= 0) {
      throw new Error(`Piece weight must be a positive number of pounds, got ${piece.weightLbs}`)
    }
    totalCubicFeet += cubicFeet(piece)
    totalWeightLbs += piece.weightLbs * quantity
    pieceCount += quantity
  }

  const density = totalWeightLbs / totalCubicFeet
  const freightClass = freightClassFromDensity(density)

  // What would it take to get into the next-cheaper class at this same cube?
  const index = DENSITY_TABLE.findIndex((row) => density >= row.minDensity)
  const nextLower = DENSITY_TABLE[index - 1]
  const poundsToNextLowerClass = nextLower
    ? Math.ceil(nextLower.minDensity * totalCubicFeet - totalWeightLbs)
    : null

  return {
    freightClass,
    densityLbsPerCubicFoot: Math.round(density * 100) / 100,
    cubicFeet: Math.round(totalCubicFeet * 100) / 100,
    totalWeightLbs,
    pieceCount,
    bracket: bracketLabel(density),
    poundsToNextLowerClass,
    caveat: CAVEAT,
  }
}

/**
 * Standard pallet footprints, for a picker. The 48×40 GMA pallet is what most
 * domestic dry freight rides on.
 */
export const STANDARD_PALLETS: { label: string; lengthIn: number; widthIn: number }[] = [
  { label: '48" × 40" (GMA standard)', lengthIn: 48, widthIn: 40 },
  { label: '48" × 48"', lengthIn: 48, widthIn: 48 },
  { label: '42" × 42"', lengthIn: 42, widthIn: 42 },
  { label: '48" × 45"', lengthIn: 48, widthIn: 45 },
  { label: '40" × 48" (turned GMA)', lengthIn: 40, widthIn: 48 },
  { label: '36" × 36"', lengthIn: 36, widthIn: 36 },
]
