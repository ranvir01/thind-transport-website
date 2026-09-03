"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  Fuel,
  Loader2,
  Mail,
  Scale,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { MARKET_DATA, EquipmentType } from "@/lib/market-data"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { emailCalculation } from "@/app/actions/email-calculation"
import { Input } from "@/components/ui/input"

// Combine static UI data with dynamic market data
const EQUIPMENT_RATES = {
  dryVan: {
    label: "Dry Van",
    minRate: MARKET_DATA.rates.dryVan.min,
    maxRate: MARKET_DATA.rates.dryVan.max,
    defaultRate: MARKET_DATA.rates.dryVan.spot,
    fuelMpg: 7.0,
    description: "General freight, retail goods"
  },
  reefer: {
    label: "Reefer",
    minRate: MARKET_DATA.rates.reefer.min,
    maxRate: MARKET_DATA.rates.reefer.max,
    defaultRate: MARKET_DATA.rates.reefer.spot,
    fuelMpg: 6.5,
    description: "Temperature-controlled loads"
  },
  flatbed: {
    label: "Flatbed",
    minRate: MARKET_DATA.rates.flatbed.min,
    maxRate: MARKET_DATA.rates.flatbed.max,
    defaultRate: MARKET_DATA.rates.flatbed.spot,
    fuelMpg: 6.8,
    description: "Steel, lumber, equipment"
  },
} as const

// Realistic expense estimates (per mile)
const EXPENSES = {
  fuel: { perGallon: MARKET_DATA.fuel.nationalAverage },
  insurance: { perMile: MARKET_DATA.expenses.insurance },
  maintenance: { perMile: MARKET_DATA.expenses.maintenance },
  permits: { perMile: MARKET_DATA.expenses.permits },
  other: { perMile: MARKET_DATA.expenses.other },
}

/** Everything but fuel, which the driver prices themselves. */
const NON_FUEL_PER_MILE =
  EXPENSES.insurance.perMile + EXPENSES.maintenance.perMile + EXPENSES.permits.perMile + EXPENSES.other.perMile

/** Our published split, as a fraction. */
const THIND_SPLIT = Number(PAY_RATES.ownerOperator.commission.replace("%", "")) / 100

/** Modelling assumptions, stated rather than buried in an expression.
 *  `FSC_PER_MILE` is an assumption of the ESTIMATE, not a term Thind
 *  publishes — the surcharge Thind publishes is the pass-through percentage in
 *  `PAY_RATES.ownerOperator.fuelSurcharge`, not a rate per mile. It belongs
 *  beside the other six modelling inputs in `src/lib/market-data.ts` so the
 *  whole cost model is reviewable in one file; that move is outside this
 *  pass's file scope, and the copy at the methodology line hedges it
 *  explicitly in the meantime. */
const FSC_PER_MILE = 0.15
const CURRENT_FSC_PASSTHROUGH = 0.8
const WEEKS_PER_YEAR = 48
const MILES_MIN = 1500
const MILES_MAX = 3500

/**
 * The signature instrument — one calculator, mounted on `/`, `/drivers` and
 * `/pay-rates`, and the only place a projected dollar figure on this site is
 * allowed to come from.
 *
 * Re-skinned to the D0 grammar: the inputs on a dark hairline panel, the
 * statement beside them as a PAPER ISLAND (`bg-paper text-ink rounded-m-3
 * border border-ink/15 p-6` — the AudienceSelector / HomeTimeLanes /
 * pay-rates grammar for dense data), every figure mono + tabular, lucide
 * glyphs where emoji used to be, and one methodology line under the numbers
 * instead of four scattered asterisks.
 *
 * The money colour is `cedar`, which DIRECTION.md §1 reserves for precisely
 * this — "Data only. Positive figures in the calculator. Never brand chrome."
 * It measures 5.98:1 on paper and only 3.05:1 on the dark frame. The previous
 * pass read that gap as licence to import `success-400` (#4ade80) from the
 * legacy semantic ramp, which put an off-palette green on the marketing site;
 * the other conclusion was the right one. A settlement statement does not
 * belong on black — §1.2 argues the whole inversion from that example — so
 * the statement moved to paper and cedar came with it.
 *
 * It also had to get SHORT. At 390px this block rendered 2,663px — the tallest
 * thing on the homepage by a wide margin, mostly duplicated summaries (a two
 * card comparison, then a bar chart of the same two numbers, then two
 * difference callouts of the same subtraction, then an annual panel). The
 * secondary inputs are behind two disclosures, the results are one mono table
 * with a single meter, and the whole section now derives to ~1,281px.
 *
 * The old CTA read "Earn {difference} More Weekly" straight off a subtraction
 * that goes negative the moment a visitor's own split is above ours — it
 * rendered "Earn -$412 More Weekly". The sign is computed now and the sentence
 * changes with it; the button says one thing regardless.
 */
export const ProfitCalculator = () => {
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("dryVan")
  const [miles, setMiles] = useState<number>(2500)
  const [lineHaulRate, setLineHaulRate] = useState<number>(EQUIPMENT_RATES.dryVan.defaultRate)
  const [fuelPrice, setFuelPrice] = useState<number>(MARKET_DATA.fuel.nationalAverage)

  // Current pay comparison — the visitor's own split, never an invented one
  const [currentSplit, setCurrentSplit] = useState(75)

  // Email capture for saving calculation
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Update rate when equipment type changes
  useEffect(() => {
    setLineHaulRate(EQUIPMENT_RATES[equipmentType].defaultRate)
  }, [equipmentType])

  // Email the visitor their estimate (and notify recruiting)
  const handleSaveCalculation = async () => {
    if (!email || !email.includes("@")) return

    setIsSending(true)
    setEmailError(null)
    try {
      const result = await emailCalculation({
        email,
        equipment: EQUIPMENT_RATES[equipmentType].label,
        miles,
        lineHaulRate,
        fuelPrice,
        weeklyGross: Math.round(thindDriverGross),
        weeklyNet: Math.round(thindNetPay),
        weeklyDifference: Math.round(weeklyDifference),
        annualNet: Math.round(thindAnnualNet),
      })
      if (result.success) {
        setEmailSent(true)
      } else {
        setEmailError(result.message)
      }
    } catch {
      setEmailError("Something went wrong — please try again or give us a call.")
    } finally {
      setIsSending(false)
    }
  }

  const equipment = EQUIPMENT_RATES[equipmentType]

  // Core calculations
  const grossRevenue = miles * lineHaulRate
  const fuelSurcharge = miles * FSC_PER_MILE
  const totalGross = grossRevenue + fuelSurcharge

  // Our split, from the published term. 100% of the fuel surcharge passes
  // through, which is why it is added whole.
  const thindDriverGross = grossRevenue * THIND_SPLIT + fuelSurcharge

  // Operating expenses
  const fuelCost = (miles / equipment.fuelMpg) * fuelPrice
  const insuranceCost = miles * EXPENSES.insurance.perMile
  const maintenanceCost = miles * EXPENSES.maintenance.perMile
  const permitsCost = miles * EXPENSES.permits.perMile
  const otherCost = miles * EXPENSES.other.perMile
  const totalExpenses = fuelCost + insuranceCost + maintenanceCost + permitsCost + otherCost

  // What the driver's current carrier leaves them, on their own split.
  const currentDriverGross =
    grossRevenue * (currentSplit / 100) + fuelSurcharge * CURRENT_FSC_PASSTHROUGH

  // Net take-home after expenses
  const thindNetPay = thindDriverGross - totalExpenses
  const currentNetPay = currentDriverGross - totalExpenses

  // Annual projection (48 weeks to account for downtime)
  const thindAnnualNet = thindNetPay * WEEKS_PER_YEAR

  // Sign-aware difference. `weeklyDifference` keeps its signed value for the
  // email payload; the copy reads off the magnitude and the direction.
  const weeklyDifference = thindNetPay - currentNetPay
  const differenceIsFlat = Math.abs(weeklyDifference) < 1
  const differenceWord = weeklyDifference >= 0 ? "more" : "less"

  // The meter: the shorter bar is always the smaller of the two nets, scaled
  // against the larger. transform-only, so it animates on the compositor.
  const netFloor = Math.max(thindNetPay, currentNetPay, 1)
  const thindScale = Math.max(0, Math.min(1, thindNetPay / netFloor))
  const currentScale = Math.max(0, Math.min(1, currentNetPay / netFloor))

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)

  const rangeClass =
    "mt-1 h-11 w-full cursor-pointer bg-transparent accent-signal"
  // Two disclosure rows on the dark input panel, one on the paper island —
  // same row, two grounds, so the ink colour is the only thing that varies.
  const summaryBase =
    "flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-m-body font-semibold [&::-webkit-details-marker]:hidden"
  const summaryClass = `${summaryBase} text-white`
  const summaryPaperClass = `${summaryBase} text-ink`
  const rowClass =
    "flex items-baseline justify-between gap-4 border-b border-ink/15 py-1.5 text-m-body"

  return (
    <section
      aria-labelledby="calculator-heading"
      className="brand-section-panel overflow-x-hidden py-section scroll-mt-20"
    >
      <div className="container">
        <div className="max-w-measure">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            Owner-operator pay
          </p>
          <h2
            id="calculator-heading"
            className="mt-3 font-display text-m-h2 font-bold text-balance text-white"
          >
            Your real take-home
          </h2>
          <p className="mt-3 text-m-body text-steel-300">
            Your miles, your rate, your split. Expenses come out, so the last line is what lands.
          </p>
        </div>

        {/* One instrument, two panels: the controls on the dark ground, the
            statement on paper beside them. Siblings share `rounded-m-3`. */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[7fr_5fr] lg:gap-6">
          {/* ---- Inputs ---------------------------------------------------- */}
          <div className="space-y-4 rounded-m-3 border border-white/10 bg-navy-900/60 p-4 sm:p-6">
            <fieldset>
              <legend className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300">
                Equipment
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  Object.entries(EQUIPMENT_RATES) as [
                    EquipmentType,
                    (typeof EQUIPMENT_RATES)[EquipmentType],
                  ][]
                ).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEquipmentType(key)}
                    aria-pressed={equipmentType === key}
                    className={`min-h-[44px] rounded-fleet border px-2 text-m-body font-semibold transition-colors duration-base ease-entrance ${
                      equipmentType === key
                        ? "border-signal bg-signal/10 text-white"
                        : "border-white/10 text-steel-200 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="calc-miles" className="text-m-body font-semibold text-white">
                  <span>Miles per week </span>
                  <span className="font-normal text-steel-300">{`(${MILES_MIN.toLocaleString()}–${MILES_MAX.toLocaleString()})`}</span>
                </label>
                <span className="font-mono text-m-body font-semibold tabular-nums text-white">
                  {miles.toLocaleString()}
                </span>
              </div>
              <input
                id="calc-miles"
                type="range"
                min={MILES_MIN}
                max={MILES_MAX}
                step="100"
                value={miles}
                onChange={(e) => setMiles(Number(e.target.value))}
                className={rangeClass}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="calc-rate" className="text-m-body font-semibold text-white">
                  <span>Linehaul rate </span>
                  <span className="font-normal text-steel-300">{`($${equipment.minRate.toFixed(2)}–$${equipment.maxRate.toFixed(2)})`}</span>
                </label>
                <span className="font-mono text-m-body font-semibold tabular-nums text-white">
                  {`$${lineHaulRate.toFixed(2)}`}
                </span>
              </div>
              <input
                id="calc-rate"
                type="range"
                min={equipment.minRate}
                max={equipment.maxRate}
                step="0.05"
                value={lineHaulRate}
                onChange={(e) => setLineHaulRate(Number(e.target.value))}
                className={rangeClass}
              />
            </div>

            {/* Secondary inputs, folded away: diesel and the per-mile running
                costs. Open it and the whole cost model is visible and editable
                — closed, it is one 44px row instead of six screens of sliders. */}
            <details className="group rounded-fleet border border-white/10">
              <summary className={summaryClass}>
                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-300" aria-hidden />
                  Adjust expenses
                </span>
                <ChevronDown
                  className="h-4 w-4 text-steel-300 motion-safe:transition-transform motion-safe:duration-base group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-white/10 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="calc-fuel" className="text-m-body font-semibold text-white">
                    Diesel per gallon
                  </label>
                  <span className="font-mono text-m-body font-semibold tabular-nums text-white">
                    {`$${fuelPrice.toFixed(2)}`}
                  </span>
                </div>
                <input
                  id="calc-fuel"
                  type="range"
                  min="3.00"
                  max="4.50"
                  step="0.05"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(Number(e.target.value))}
                  className={rangeClass}
                />
                <p className="mt-1 font-mono text-m-micro tabular-nums text-steel-300">
                  {`National average $${MARKET_DATA.fuel.nationalAverage.toFixed(2)} · ${equipment.fuelMpg} MPG on ${equipment.label.toLowerCase()}`}
                </p>

                <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                  <div className="flex items-baseline justify-between gap-4 text-m-body">
                    <dt className="inline-flex items-center gap-2 text-steel-200">
                      <Fuel className="h-4 w-4 text-steel-300" aria-hidden />
                      {`Fuel, ${Math.round(miles / equipment.fuelMpg).toLocaleString()} gal`}
                    </dt>
                    <dd className="font-mono tabular-nums text-white">{`−${formatCurrency(fuelCost)}`}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-m-body">
                    <dt className="inline-flex items-center gap-2 text-steel-200">
                      <ShieldCheck className="h-4 w-4 text-steel-300" aria-hidden />
                      Insurance
                    </dt>
                    <dd className="font-mono tabular-nums text-white">{`−${formatCurrency(insuranceCost)}`}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-m-body">
                    <dt className="inline-flex items-center gap-2 text-steel-200">
                      <Wrench className="h-4 w-4 text-steel-300" aria-hidden />
                      Maintenance
                    </dt>
                    <dd className="font-mono tabular-nums text-white">{`−${formatCurrency(maintenanceCost)}`}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-m-body">
                    <dt className="inline-flex items-center gap-2 text-steel-200">
                      <ClipboardList className="h-4 w-4 text-steel-300" aria-hidden />
                      Permits and other
                    </dt>
                    <dd className="font-mono tabular-nums text-white">
                      {`−${formatCurrency(permitsCost + otherCost)}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </details>

            {/* The comparison input. Not an expense, so it gets its own row
                rather than hiding inside "Adjust expenses". */}
            <details className="group rounded-fleet border border-white/10">
              <summary className={summaryClass}>
                <span className="inline-flex items-center gap-2">
                  <Scale className="h-4 w-4 text-orange-300" aria-hidden />
                  Compare your current split
                </span>
                <ChevronDown
                  className="h-4 w-4 text-steel-300 motion-safe:transition-transform motion-safe:duration-base group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-white/10 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="calc-current-split"
                    className="text-m-body font-semibold text-white"
                  >
                    Your split today
                  </label>
                  <span className="font-mono text-m-body font-semibold tabular-nums text-white">
                    {`${currentSplit}%`}
                  </span>
                </div>
                <input
                  id="calc-current-split"
                  type="range"
                  min="60"
                  max="95"
                  step="1"
                  value={currentSplit}
                  onChange={(e) => setCurrentSplit(Number(e.target.value))}
                  className={rangeClass}
                />
                <p className="mt-1 text-m-micro text-steel-300">
                  {`We model your carrier keeping the same running costs and passing through ${Math.round(
                    CURRENT_FSC_PASSTHROUGH * 100
                  )}% of the fuel surcharge; ours is ${PAY_RATES.ownerOperator.fuelSurcharge}.`}
                </p>
              </div>
            </details>
          </div>

          {/* ---- The statement, as a paper island ---------------------------
              Dense data gets paper: this is a settlement statement, and it
              reads as one. It is also what lets `cedar` carry the take-home
              (5.98:1 here, 3.05:1 on the dark frame it used to sit on). */}
          <div className="rounded-m-3 border border-ink/15 bg-paper p-6 text-ink">
            <h3 className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Your week
            </h3>

            <dl className="mt-3">
              <div className={rowClass}>
                <dt className="text-ink-2">Gross, all in</dt>
                <dd className="font-mono tabular-nums text-ink">{formatCurrency(totalGross)}</dd>
              </div>
              <div className={rowClass}>
                <dt className="text-ink-2">{`Your ${PAY_RATES.ownerOperator.commission} share`}</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatCurrency(thindDriverGross)}
                </dd>
              </div>
              <div className={rowClass}>
                <dt className="text-ink-2">Operating expenses</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {`−${formatCurrency(totalExpenses)}`}
                </dd>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-3">
                <dt className="text-m-body font-semibold text-ink">Take-home</dt>
                <dd className="font-mono text-m-h3 font-bold tabular-nums text-cedar">
                  {formatCurrency(thindNetPay)}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 text-m-micro text-ink-2">
                <dt>{`Over ${WEEKS_PER_YEAR} working weeks`}</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(thindAnnualNet)}</dd>
              </div>
            </dl>

            {/* The one bar that moves. scaleX from the left edge — never width,
                which lays out and paints on every frame. */}
            <div className="mt-3 space-y-1" aria-hidden>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full origin-left rounded-full bg-cedar motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-entrance"
                  style={{ transform: `scaleX(${thindScale})` }}
                />
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full origin-left rounded-full bg-ink-3 motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-entrance"
                  style={{ transform: `scaleX(${currentScale})` }}
                />
              </div>
            </div>
            <p className="mt-2 text-m-body text-ink-2">
              {differenceIsFlat
                ? `At ${currentSplit}% you take home about the same each week.`
                : `That is about ${formatCurrency(Math.abs(weeklyDifference))} ${differenceWord} a week than your ${currentSplit}% split.`}
            </p>

            {/* The one methodology line. Every assumption the numbers above
                stand on, in a sentence, instead of four scattered asterisks.
                The split and the pass-through are published terms and read as
                facts; the two per-mile dollar figures are estimates of the
                MARKET, so they are hedged as modelling — the same "We model"
                the comparison note uses — rather than printed as though Thind
                published a $/mile surcharge. */}
            <p className="mt-3 text-m-micro text-ink-2">
              {`Miles × rate, our ${PAY_RATES.ownerOperator.commission} split, ${PAY_RATES.ownerOperator.fuelSurcharge} of the fuel surcharge in, diesel and running costs out. We model the surcharge at $${FSC_PER_MILE.toFixed(
                2
              )} a mile and running costs at $${NON_FUEL_PER_MILE.toFixed(
                2
              )} a mile. An estimate, not an offer.`}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/apply"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                Start your application
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {/* `hover:text-signal`, not the inherited hover: globals.css
                  paints `a:hover` (0,1,1) with signal-up, which is 3.18:1 on
                  paper. The utility variant is (0,2,0) and wins at 5.33:1. */}
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-ink underline-offset-4 hover:text-signal hover:underline"
              >
                <span>or call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </div>

            <details className="group mt-3 rounded-fleet border border-ink/15">
              <summary className={summaryPaperClass}>
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-signal" aria-hidden />
                  Email me this breakdown
                </span>
                <ChevronDown
                  className="h-4 w-4 text-ink-3 motion-safe:transition-transform motion-safe:duration-base group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-ink/15 p-4">
                {emailSent ? (
                  <p className="text-m-body font-semibold text-cedar">
                    Estimate sent — check your inbox.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label htmlFor="calc-email" className="sr-only">
                        Email address for your earnings estimate
                      </label>
                      {/* The primitive ships `bg-white text-neutral-900`, both
                          of which `.brand-page-shell` remaps to dark values on
                          /drivers. Passing the paper tokens makes tailwind-merge
                          DROP those two classes, so the remap selectors never
                          match and the field looks the same on /drivers as it
                          does on / and /pay-rates. The border is `ink-2`, the
                          value DIRECTION §1 measures as the input border
                          (7.33:1) — an empty field's only affordance is its
                          edge, so it needs the 3:1 that a hairline like
                          `ink/20` (1.53:1) does not carry. The Send control
                          matches it so the pair reads as one row. */}
                      <Input
                        id="calc-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-ink-2 bg-paper text-ink placeholder:text-ink-3 hover:border-ink sm:flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCalculation}
                        disabled={isSending || !email.includes("@")}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-fleet border border-ink-2 bg-paper px-4 text-m-body font-semibold text-ink transition-colors duration-base ease-entrance hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
                        ) : (
                          <Mail className="h-4 w-4" aria-hidden />
                        )}
                        Send it
                      </button>
                    </div>
                    {/* What actually becomes of the address. The server action
                        mails the estimate to the visitor AND files a copy with
                        the office, so the field says so before it is typed in
                        rather than after. */}
                    <p className="mt-2 text-m-micro text-ink-2">
                      We email the estimate to you, and a copy goes to our recruiting team.
                    </p>
                  </>
                )}
                {emailError ? (
                  <p className="mt-2 text-m-body text-signal" role="alert">
                    {emailError}
                  </p>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}
