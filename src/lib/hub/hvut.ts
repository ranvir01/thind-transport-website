/**
 * Heavy Vehicle Use Tax — IRS Form 2290 (26 U.S.C. 4481).
 *
 * Every truck with a taxable gross weight of 55,000 lbs or more owes this
 * annually for the tax period running July 1 through June 30. For a fifteen-
 * truck fleet at the 80,000 lb ceiling that is $8,250 a year, due by August 31,
 * and the stamped Schedule 1 is what the state wants before it will renew a
 * plate. Missing it is not a small problem.
 *
 * All money is integer cents, like everything else in the hub. That matters
 * more than usual here: the logging-vehicle rate is exactly 75% of the regular
 * rate, which puts real half-dollars in the table ($412.50, $16.50 per
 * thousand), and partial-period proration divides by twelve.
 *
 * This computes the tax. It does not file anything — Form 2290 goes to the IRS
 * through an e-file provider or on paper, and the stamped Schedule 1 comes
 * back from them.
 */

/** Below this, the vehicle is not taxable at all. */
export const HVUT_MIN_TAXABLE_LBS = 55_000
/** Above this, the tax stops climbing (Category V). */
export const HVUT_MAX_WEIGHT_LBS = 75_000
/** Category A: the tax at exactly 55,000 lbs. */
export const HVUT_BASE_CENTS = 10_000
/** Each additional 1,000 lbs over 55,000. */
export const HVUT_PER_1000_CENTS = 2_200
/** Category V: the ceiling for anything over 75,000 lbs. */
export const HVUT_MAX_CENTS = 55_000
/** 4481(b): vehicles used exclusively in the transport of harvested forest products. */
export const HVUT_LOGGING_NUMERATOR = 3
export const HVUT_LOGGING_DENOMINATOR = 4

/** 4483(d): the mileage-use limits below which a vehicle is tax-suspended. */
export const SUSPENSION_MILES = 5_000
export const SUSPENSION_MILES_AGRICULTURAL = 7_500

export interface HvutInput {
  /** Taxable gross weight in pounds: truck + trailers + max customary load. */
  taxableGrossWeightLbs: number
  /**
   * Month the vehicle was first used in the tax period. 1-12 calendar months
   * (July = 7). Defaults to July, the start of the period.
   */
  firstUsedMonth?: number
  /** 4481(b): logging vehicles pay three-quarters of the regular rate. */
  logging?: boolean
  /**
   * Expected miles for the period. At or below the suspension limit the
   * vehicle owes no tax but must still be reported (Category W).
   */
  expectedMiles?: number
  /** Agricultural vehicles get the higher 7,500-mile suspension limit. */
  agricultural?: boolean
}

export interface HvutResult {
  /** IRS weight category letter, or "W" for a suspended vehicle. */
  category: string
  /** Tax owed for this vehicle, in cents. */
  taxCents: number
  /** The full-year figure before any partial-period proration. */
  annualCents: number
  /** Months of the tax period this vehicle is being taxed for (1-12). */
  monthsTaxed: number
  /** True when the vehicle is under 55,000 lbs and simply not taxable. */
  exempt: boolean
  /** True when reported under the mileage-use limit (Category W). */
  suspended: boolean
  /** Last day of the month following first use — the filing deadline. */
  dueOn: string
  /** Plain-language summary for a compliance row or a settlement note. */
  explanation: string
}

/**
 * IRS weight categories: A is exactly 55,000 lbs and each letter after it adds
 * a thousand pounds, up to U at 75,000. V is everything heavier and is where
 * the tax stops climbing.
 */
export function hvutCategory(taxableGrossWeightLbs: number): string | null {
  if (taxableGrossWeightLbs < HVUT_MIN_TAXABLE_LBS) return null
  if (taxableGrossWeightLbs > HVUT_MAX_WEIGHT_LBS) return "V"
  // 55,000 → A; 55,001-56,000 → B; …; 74,001-75,000 → U.
  const over = taxableGrossWeightLbs - HVUT_MIN_TAXABLE_LBS
  const step = over === 0 ? 0 : Math.ceil(over / 1_000)
  return String.fromCharCode("A".charCodeAt(0) + step)
}

/** The full-period tax for a weight, before proration. */
export function hvutAnnualCents(taxableGrossWeightLbs: number, logging = false): number {
  if (taxableGrossWeightLbs < HVUT_MIN_TAXABLE_LBS) return 0

  let cents: number
  if (taxableGrossWeightLbs > HVUT_MAX_WEIGHT_LBS) {
    cents = HVUT_MAX_CENTS
  } else {
    const over = taxableGrossWeightLbs - HVUT_MIN_TAXABLE_LBS
    const steps = over === 0 ? 0 : Math.ceil(over / 1_000)
    cents = HVUT_BASE_CENTS + steps * HVUT_PER_1000_CENTS
  }
  if (!logging) return cents
  // Exactly three-quarters. Every regular rate is a whole number of dollars,
  // and a quarter of $22 is $5.50, so this always lands on a whole cent.
  return (cents * HVUT_LOGGING_NUMERATOR) / HVUT_LOGGING_DENOMINATOR
}

/**
 * Months of the July-June period remaining, counting the month of first use.
 * July is a full twelve; a truck first used in November is taxed for eight.
 */
export function monthsInTaxPeriod(firstUsedMonth: number): number {
  if (!Number.isInteger(firstUsedMonth) || firstUsedMonth < 1 || firstUsedMonth > 12) {
    throw new Error(`Month of first use must be 1-12, got ${firstUsedMonth}`)
  }
  // July (7) is period month 1, June (6) is period month 12.
  const periodMonth = firstUsedMonth >= 7 ? firstUsedMonth - 6 : firstUsedMonth + 6
  return 13 - periodMonth
}

/**
 * Filing deadline: the last day of the month following the month of first use.
 * A truck put in service in July is due August 31 — the deadline the whole
 * fleet hits every year.
 */
export function form2290DueDate(firstUsedMonth: number, firstUsedYear: number): string {
  // Day 0 of a month is the last day of the one before it, and Date rolls the
  // year over on its own — so month index (firstUsedMonth + 1) lands on the
  // last day of the month following first use. Done in one step deliberately:
  // constructing the end of one month and then advancing setUTCMonth overflows
  // (October 31 + one month is December 1), which is how this shipped wrong
  // the first time.
  return new Date(Date.UTC(firstUsedYear, firstUsedMonth + 1, 0)).toISOString().slice(0, 10)
}

export function calculateHvut(input: HvutInput, taxYearStart?: number): HvutResult {
  const {
    taxableGrossWeightLbs,
    firstUsedMonth = 7,
    logging = false,
    expectedMiles,
    agricultural = false,
  } = input

  if (!Number.isFinite(taxableGrossWeightLbs) || taxableGrossWeightLbs < 0) {
    throw new Error("Taxable gross weight must be a positive number of pounds")
  }

  const monthsTaxed = monthsInTaxPeriod(firstUsedMonth)
  // The tax period containing the month of first use begins in July: a
  // vehicle first used in March 2027 belongs to the period that opened in
  // July 2026.
  const periodStartYear =
    taxYearStart ??
    (firstUsedMonth >= 7 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1)
  const firstUsedYear = firstUsedMonth >= 7 ? periodStartYear : periodStartYear + 1
  const dueOn = form2290DueDate(firstUsedMonth, firstUsedYear)

  if (taxableGrossWeightLbs < HVUT_MIN_TAXABLE_LBS) {
    return {
      category: "—",
      taxCents: 0,
      annualCents: 0,
      monthsTaxed,
      exempt: true,
      suspended: false,
      dueOn,
      explanation: `Under ${HVUT_MIN_TAXABLE_LBS.toLocaleString()} lbs taxable gross weight — no Form 2290 tax due.`,
    }
  }

  const limit = agricultural ? SUSPENSION_MILES_AGRICULTURAL : SUSPENSION_MILES
  const annualCents = hvutAnnualCents(taxableGrossWeightLbs, logging)

  if (expectedMiles != null && expectedMiles <= limit) {
    return {
      category: "W",
      taxCents: 0,
      annualCents,
      monthsTaxed,
      exempt: false,
      suspended: true,
      dueOn,
      explanation:
        `Suspended (Category W): expected ${expectedMiles.toLocaleString()} miles is at or under the ` +
        `${limit.toLocaleString()}-mile limit for ${agricultural ? "agricultural" : "regular"} vehicles. ` +
        `No tax owed, but the vehicle must still be reported on Form 2290 — and if it goes over the ` +
        `limit mid-period the full $${(annualCents / 100).toFixed(2)} becomes due.`,
    }
  }

  const taxCents = monthsTaxed === 12 ? annualCents : Math.round((annualCents * monthsTaxed) / 12)
  const category = hvutCategory(taxableGrossWeightLbs)!

  return {
    category,
    taxCents,
    annualCents,
    monthsTaxed,
    exempt: false,
    suspended: false,
    dueOn,
    explanation:
      `Category ${category}${logging ? " (logging rate)" : ""}: ` +
      (monthsTaxed === 12
        ? `$${(taxCents / 100).toFixed(2)} for the full July-June period.`
        : `$${(taxCents / 100).toFixed(2)} — ${monthsTaxed} of 12 months at the ` +
          `$${(annualCents / 100).toFixed(2)} annual rate.`) +
      ` Due ${dueOn}.`,
  }
}

export interface FleetHvutLine {
  unitNumber: string
  result: HvutResult
}

/**
 * What the whole fleet owes. Trucks carry no gross-weight column today, so the
 * caller supplies the weight — 80,000 lbs is the ordinary answer for a
 * tractor-trailer and puts every unit in Category V at the $550 ceiling.
 */
export function fleetHvut(
  trucks: { unitNumber: string; taxableGrossWeightLbs?: number; logging?: boolean; expectedMiles?: number }[],
  options: { firstUsedMonth?: number; defaultWeightLbs?: number } = {}
): { lines: FleetHvutLine[]; totalCents: number; dueOn: string | null } {
  const defaultWeight = options.defaultWeightLbs ?? 80_000
  const lines = trucks.map((truck) => ({
    unitNumber: truck.unitNumber,
    result: calculateHvut({
      taxableGrossWeightLbs: truck.taxableGrossWeightLbs ?? defaultWeight,
      firstUsedMonth: options.firstUsedMonth,
      logging: truck.logging,
      expectedMiles: truck.expectedMiles,
    }),
  }))
  return {
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.result.taxCents, 0),
    dueOn: lines[0]?.result.dueOn ?? null,
  }
}
