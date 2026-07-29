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
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Fuel, Info } from "lucide-react"
import { MARKET_DATA } from "@/lib/market-data"
import { CountUp } from "@/components/shared/CountUp"

const money = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

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
        <label htmlFor={id} className="text-sm font-bold text-gray-900">
          {label}
        </label>
        <span className="font-mono text-sm font-black tabular-nums text-orange-600">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-orange-600"
      />
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
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
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/10">
            <Fuel className="h-5 w-5 text-orange-600" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-gray-900">What the card is worth to you</h2>
            <p className="text-sm text-gray-600">
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
            hint="A loaded 2024 Cascadia on flat interstate sits around 7.0; heavy flatbed and mountains pull it down."
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

        <div className="rounded-2xl bg-[#0F1013] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
            Discount captured
          </p>
          <p className="mt-1 font-mono text-4xl font-black text-orange-400">
            <CountUp value={calc.annualSaving} prefix="$" />
            <span className="ml-1 text-base font-bold text-white/60">/yr</span>
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/70">Per week</dt>
              <dd className="font-mono font-bold tabular-nums">{money(calc.weeklySaving)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/70">Per month</dt>
              <dd className="font-mono font-bold tabular-nums">{money(calc.monthlySaving)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/70">Gallons a year</dt>
              <dd className="font-mono font-bold tabular-nums">
                {Math.round(calc.annualGallons).toLocaleString("en-US")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
              Fuel cost per mile
            </p>
            <div className="mt-2 flex items-end gap-4">
              <div>
                <p className="font-mono text-xl font-black text-white/50 line-through">
                  ${calc.costPerMileRetail.toFixed(3)}
                </p>
                <p className="text-[11px] text-white/50">At the pump</p>
              </div>
              <ArrowRight className="mb-5 h-4 w-4 text-white/30" aria-hidden />
              <div>
                <p className="font-mono text-xl font-black text-green-400">
                  ${calc.costPerMileCard.toFixed(3)}
                </p>
                <p className="text-[11px] text-white/50">With the card</p>
              </div>
            </div>
          </div>

          <p className="mt-5 flex gap-2 text-xs leading-relaxed text-white/70">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden />
            On top of this, 100% of the fuel surcharge on every load goes to you — we keep none of it,
            and it is listed as its own line on your settlement.
          </p>

          <Link
            href="/pay-rates"
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold uppercase tracking-wide text-white transition-all duration-fast ease-entrance hover:bg-orange-500 motion-safe:hover:-translate-y-0.5"
          >
            Put this in the pay calculator <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <p className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-xs leading-relaxed text-gray-500 md:px-8">
        An estimate from your inputs, not a guaranteed saving. Discounts move with the chain, the
        state, and the week; taxes and cash-vs-credit pricing differ by location. What doesn&apos;t
        move: we pass the discount through at cost and keep no rebate.
      </p>
    </div>
  )
}
