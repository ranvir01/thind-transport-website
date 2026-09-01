/**
 * Vetting constants + pure risk scorer shared by server libs and client
 * components. Plain module — NO database imports.
 */

/** Pure risk scorer — unit-tested. 0 = walk away, 100 = book with confidence. */
export function computeRiskScore(input: {
  allowedToOperate: boolean | null
  authorityStatus: string | null
  nameMatches: boolean | null
  avgDaysToPay: number | null
  paymentTermsDays: number
}): { score: number; reasons: string[] } {
  let score = 70 // unknown-but-unremarkable baseline
  const reasons: string[] = []

  if (input.allowedToOperate === true) {
    score += 20
    reasons.push("FMCSA authority active")
  } else if (input.allowedToOperate === false) {
    return { score: 5, reasons: ["FMCSA says NOT allowed to operate — do not book"] }
  } else {
    reasons.push("Authority not verified yet")
  }

  if (input.authorityStatus && /revok|inactiv|suspend/i.test(input.authorityStatus)) {
    score -= 40
    reasons.push(`Authority status: ${input.authorityStatus}`)
  }

  if (input.nameMatches === false) {
    score -= 25
    reasons.push("Name doesn't match the FMCSA record — classic double-brokering tell")
  }

  if (input.avgDaysToPay != null) {
    if (input.avgDaysToPay <= input.paymentTermsDays) {
      score += 10
      reasons.push(`Pays in ~${Math.round(input.avgDaysToPay)} days (inside terms)`)
    } else if (input.avgDaysToPay > input.paymentTermsDays + 15) {
      score -= 20
      reasons.push(`Slow payer: ~${Math.round(input.avgDaysToPay)} days vs ${input.paymentTermsDays}-day terms`)
    } else {
      reasons.push(`Pays in ~${Math.round(input.avgDaysToPay)} days`)
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

/** The double-brokering red flags, shown inline wherever booking happens. */
export const DOUBLE_BROKER_CHECKLIST = [
  "MC number is brand new (authority < 6 months old)",
  "Contact email/phone doesn't match the FMCSA record",
  "Pressure to skip the broker-carrier agreement or COI",
  "Rate is well above market for the lane",
  "Refuses to honor your factoring company's NOA",
] as const
