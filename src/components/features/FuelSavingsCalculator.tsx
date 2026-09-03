"use client"

/**
 * What the fuel card is actually worth, in dollars, for your truck.
 *
 * The fuel page used to assert "save up to 50¢ a gallon" and stop there — a
 * number nobody can convert into their own week without a calculator app. This
 * does the arithmetic: gallons burned, discount captured, and the fuel surcharge
 * we pass through at 100%, all off the driver's own miles and MPG.
 *
 * Every figure is the visitor's input times a number they can check. Nothing
 * here is a projection of what we'll pay you — it's what diesel costs and what
 * the discount removes from it.
 *
 * D0 token pass: the instrument is a paper island (dense data on paper, the
 * AudienceSelector / HomeTimeLanes grammar) with one inverted result panel.
 * The arithmetic is untouched. The annual figure used to run through <CountUp>,
 * whose effect keys on `value` — so every slider tick reset it to zero and
 * re-animated. A live figure is already the motion; it is now plain mono
 * tabular text that tracks the slider exactly.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Fuel, Info } from "lucide-react"
import { PAY_RATES } from "@/lib/constants"
import { MARKET_DATA } from "@/lib/market-data"

const money = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/** 44px hit area, an 8px track, a round thumb — one class list, both engines. */
const RANGE_CLASS = [
  "mt-2 h-11 w-full cursor-pointer appearance-none bg-transparent accent-orange-600",
  "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-ink/15",
  "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-signal",
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-ink/15",
  "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-signal",
].join(" ")

interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  hint?: string
  onChange: (v: number) => void
}

function Slider({ id, label, value, min, max, step, display, hint, onChange }: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-m-body font-semibold text-ink">
          {label}
        </label>
        <span className="font-mono text-m-body font-bold tabular-nums text-signal">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={RANGE_CLASS}
      />
      {hint ? <p className="mt-1.5 text-m-micro text-ink-2">{hint}</p> : null}
    </div>
  )
}

export function FuelSavingsCalculator() {
  const [weeklyMiles, setWeeklyMiles] = useState(2500)
  const [mpg, setMpg] = useState(6.5)
  const [pumpPrice, setPumpPrice] = useState<number>(MARKET_DATA.fuel.nationalAverage)
  const [discount, setDiscount] = useState(0.5)

  const calc = useMemo(() => {
    const gallonsPerWeek = weeklyMiles / mpg
    const weeklySaving = gallonsPerWeek * discount
    const costPerMileRetail = (pumpPrice * gallonsPerWeek) / weeklyMiles
    const costPerMileCard = ((pumpPrice - discount) * gallonsPerWeek) / weeklyMiles

    return {
      gallonsPerWeek,
      weeklySaving,
      monthlySaving: weeklySaving * 4.33,
      annualSaving: weeklySaving * 52,
      costPerMileRetail,
      costPerMileCard,
      annualGallons: gallonsPerWeek * 52,
    }
  }, [weeklyMiles, mpg, pumpPrice, discount])

  return (
    <div className="overflow-hidden rounded-m-3 border border-ink/15 bg-paper text-ink">
      <div className="border-b border-ink/15 px-6 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/10">
            <Fuel className="h-5 w-5 text-signal" aria-hidden />
          </span>
          <div>
            <h2 id="fuel-calculator-heading" className="font-display text-m-h4 font-bold text-ink">
              What the card is worth to you
            </h2>
            <p className="text-m-body text-ink-2">
              Your miles, your MPG, today&apos;s pump price. Move a slider and watch it change.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-6">
          <Slider
            id="fuel-miles"
            label="Miles per week"
            value={weeklyMiles}
            min={500}
            max={4000}
            step={50}
            display={weeklyMiles.toLocaleString("en-US")}
            hint="Most of our OTR trucks run 2,200–3,000."
            onChange={setWeeklyMiles}
          />
          <Slider
            id="fuel-mpg"
            label="Your MPG"
            value={mpg}
            min={4.5}
            max={9}
            step={0.1}
            display={`${mpg.toFixed(1)} mpg`}
            hint="A loaded late-model Cascadia on flat interstate sits around 7.0; heavy flatbed and mountains pull it down."
            onChange={setMpg}
          />
          <Slider
            id="fuel-price"
            label="Pump price"
            value={pumpPrice}
            min={2.5}
            max={6}
            step={0.01}
            display={`${money(pumpPrice, 2)}/gal`}
            hint={`National average when this page was last updated: ${money(MARKET_DATA.fuel.nationalAverage, 2)}.`}
            onChange={setPumpPrice}
          />
          <Slider
            id="fuel-discount"
            label="Card discount"
            value={discount}
            min={0}
            max={0.75}
            step={0.01}
            display={`${(discount * 100).toFixed(0)}¢/gal`}
            hint="Real discounts vary by chain and by week — 30¢ to 75¢ is the range we see."
            onChange={setDiscount}
          />
        </div>

        <div className="rounded-m-2 border border-white/10 bg-asphalt p-6 text-paper">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            Discount captured
          </p>
          <p className="mt-1 font-mono text-m-h2 font-bold tabular-nums text-paper">
            <span>{money(calc.annualSaving)}</span>
            <span className="ml-1 font-sans text-m-body font-semibold text-paper/70">/yr</span>
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-m-body">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-paper/70">Per week</dt>
              <dd className="font-mono font-semibold tabular-nums text-paper">{money(calc.weeklySaving)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-paper/70">Per month</dt>
              <dd className="font-mono font-semibold tabular-nums text-paper">{money(calc.monthlySaving)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-paper/70">Gallons a year</dt>
              <dd className="font-mono font-semibold tabular-nums text-paper">
                {Math.round(calc.annualGallons).toLocaleString("en-US")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-m-2 border border-white/10 bg-white/5 p-4">
            <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-paper/60">
              Fuel cost per mile
            </p>
            <div className="mt-2 flex items-end gap-4">
              <div>
                <p className="font-mono text-m-lede font-bold tabular-nums text-paper/60 line-through">
                  {`$${calc.costPerMileRetail.toFixed(3)}`}
                </p>
                <p className="text-m-micro text-paper/60">At the pump</p>
              </div>
              <ArrowRight className="mb-5 h-4 w-4 text-paper/40" aria-hidden />
              <div>
                <p className="font-mono text-m-lede font-bold tabular-nums text-paper">
                  {`$${calc.costPerMileCard.toFixed(3)}`}
                </p>
                <p className="text-m-micro text-paper/60">With the card</p>
              </div>
            </div>
          </div>

          <p className="mt-5 flex gap-2 text-m-body text-paper/80">
            <Info className="mt-1 h-4 w-4 shrink-0 text-paper/50" aria-hidden />
            <span>
              <span>On top of this, </span>
              <span className="font-mono tabular-nums">{PAY_RATES.ownerOperator.fuelSurcharge}</span>
              <span> of the fuel surcharge on every load goes to you — we keep none of it, and it is listed as its own line on your settlement.</span>
            </span>
          </p>

          <p className="mt-5">
            <Link
              href="/pay-rates"
              className="inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-paper underline-offset-4 hover:text-orange-300 hover:underline"
            >
              <span>Put this in the pay calculator</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        </div>
      </div>

      <p className="border-t border-ink/15 px-6 py-4 text-m-micro text-ink-2 md:px-8">
        An estimate from your inputs, not a guaranteed saving. Discounts move with the chain, the
        state, and the week; taxes and cash-vs-credit pricing differ by location. What doesn&apos;t
        move: we pass the discount through at cost and keep no rebate.
      </p>
    </div>
  )
}
