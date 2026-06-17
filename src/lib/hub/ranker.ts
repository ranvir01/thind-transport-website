import { roundHalfAwayFromZero } from "./money"

export interface RankerInput {
  linehaulCents: number
  fuelSurchargeCents: number
  loadedMiles: number
  deadheadMiles: number
  dieselCentsPerGallon: number
  mpg: number
  estimatedTollsCents?: number
  hosHoursRemaining?: number | null
  laneStrength?: "strong" | "average" | "weak"
  homeTimeFit?: "good" | "neutral" | "bad"
  customerPaymentDays?: number | null
  blacklisted?: boolean
  equipmentMatch?: boolean
}

export interface RankerScore {
  score: number
  math: {
    totalRevenueCents: number
    totalMiles: number
    ratePerTotalMile: string
    estimatedFuelCents: number
    estimatedTollsCents: number
    netAfterFuelAndTollsCents: number
    netPerTotalMile: string
    rateScore: number
    hosScore: number
    laneScore: number
    homeTimeScore: number
    paymentScore: number
    blacklistPenalty: number
    equipmentPenalty: number
    explanation: string
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Deterministic "best load today" score. No AI, no hidden weights.
 * Scores around:
 * - 0–45: net revenue per all miles after fuel/tolls
 * - 0–15: HOS fit
 * - 0–15: destination lane strength
 * - -10–10: home-time fit
 * - -15–10: customer payment speed
 * - hard penalties for blacklist/equipment mismatch
 */
export function scoreLoadCandidate(input: RankerInput): RankerScore {
  const totalRevenueCents = input.linehaulCents + input.fuelSurchargeCents
  const totalMiles = Math.max(1, input.loadedMiles + input.deadheadMiles)
  const estimatedFuelCents = input.mpg > 0
    ? roundHalfAwayFromZero((totalMiles / input.mpg) * input.dieselCentsPerGallon)
    : 0
  const estimatedTollsCents = input.estimatedTollsCents ?? 0
  const netAfterFuelAndTollsCents = totalRevenueCents - estimatedFuelCents - estimatedTollsCents
  const ratePerTotalMileDollars = totalRevenueCents / 100 / totalMiles
  const netPerTotalMileDollars = netAfterFuelAndTollsCents / 100 / totalMiles

  // $2.00/mi net = 0, $3.25/mi net = 45
  const rateScore = clamp(Math.round(((netPerTotalMileDollars - 2) / 1.25) * 45), 0, 45)
  const hosScore = input.hosHoursRemaining == null
    ? 6
    : input.hosHoursRemaining >= 8
      ? 15
      : input.hosHoursRemaining >= 5
        ? 10
        : 3
  const laneScore = input.laneStrength === "strong" ? 15 : input.laneStrength === "weak" ? 4 : 9
  const homeTimeScore = input.homeTimeFit === "good" ? 10 : input.homeTimeFit === "bad" ? -10 : 0
  const paymentScore = input.customerPaymentDays == null
    ? 0
    : input.customerPaymentDays <= 21
      ? 10
      : input.customerPaymentDays <= 35
        ? 3
        : -15
  const blacklistPenalty = input.blacklisted ? -100 : 0
  const equipmentPenalty = input.equipmentMatch === false ? -50 : 0

  const score = clamp(
    rateScore + hosScore + laneScore + homeTimeScore + paymentScore + blacklistPenalty + equipmentPenalty,
    0,
    100
  )

  const factors = [
    `$${ratePerTotalMileDollars.toFixed(2)}/mi all-in`,
    `$${netPerTotalMileDollars.toFixed(2)}/mi after fuel/tolls`,
    `${input.laneStrength ?? "average"} outbound lane`,
    `${input.customerPaymentDays ?? "unknown"} day payer`,
  ]
  if (input.blacklisted) factors.push("blacklist penalty")
  if (input.equipmentMatch === false) factors.push("equipment mismatch penalty")

  return {
    score,
    math: {
      totalRevenueCents,
      totalMiles,
      ratePerTotalMile: ratePerTotalMileDollars.toFixed(2),
      estimatedFuelCents,
      estimatedTollsCents,
      netAfterFuelAndTollsCents,
      netPerTotalMile: netPerTotalMileDollars.toFixed(2),
      rateScore,
      hosScore,
      laneScore,
      homeTimeScore,
      paymentScore,
      blacklistPenalty,
      equipmentPenalty,
      explanation: factors.join(" · "),
    },
  }
}
