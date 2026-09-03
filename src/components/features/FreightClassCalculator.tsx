"use client"

/**
 * Public LTL freight-class calculator.
 *
 * The classification math lives in @/lib/hub/freight-class and is unit-tested
 * against the NMFTA density table; this component is the form around it. It is
 * a lead magnet on purpose — a shipper who works out their class here is a
 * shipper with freight to move, so the result panel hands off to the quote
 * form with the shipment already described.
 *
 * One paper island on the dark page ground, the same grammar as the lane
 * estimator: inputs on the left, a hairline-framed instrument on the right
 * with mono tabular figures, one red action at the bottom. Fields go through
 * the shared Input primitive (16px on touch, rounded-fleet, one focus outline
 * from globals.css) retinted for paper; the native <select> borrows the same
 * variant so the pallet picker matches the fields beside it.
 */
import { useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, Calculator, Info, Plus, Trash2 } from "lucide-react"
import { track } from "@vercel/analytics"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input, inputVariants } from "@/components/ui/input"
import {
  STANDARD_PALLETS,
  classifyShipment,
  type Piece,
} from "@/lib/hub/freight-class"

interface PieceInput {
  lengthIn: string
  widthIn: string
  heightIn: string
  weightLbs: string
  quantity: string
}

const BLANK: PieceInput = { lengthIn: "48", widthIn: "40", heightIn: "48", weightLbs: "", quantity: "1" }

/** Class → the shorthand a shipper sees on a rate sheet. */
const CLASS_HINT: Record<string, string> = {
  "50": "Dense, durable freight — the cheapest class there is.",
  "55": "Bricks, cement, hardwood flooring.",
  "60": "Car accessories, steel cabling.",
  "65": "Bottled beverages, books, boxed goods.",
  "70": "Auto parts, food items, machinery.",
  "77.5": "Tires, bathroom fixtures.",
  "85": "Crated machinery, cast iron stoves.",
  "92.5": "Appliances, computers, boxed monitors.",
  "100": "Car covers, canvas, boat covers.",
  "110": "Cabinets, framed art, table saws.",
  "125": "Small household appliances.",
  "150": "Auto sheet metal, bookcases.",
  "175": "Clothing, couches, stuffed furniture.",
  "200": "Sheet metal parts, aluminum tables.",
  "250": "Mattresses, plasma TVs, bamboo furniture.",
  "300": "Wood cabinets, tables, chairs.",
  "400": "Deer antlers — genuinely, this is the textbook example.",
  "500": "Ping pong balls, gold dust. Lowest density, highest rate.",
}

/** The Input primitive retinted for paper — twMerge swaps its neutral tokens
 *  for ink, so no `bg-white` is left for the page shell to remap. */
const FIELD = "border-ink/20 bg-paper text-ink shadow-none placeholder:text-ink-3 hover:border-ink/40"
const SELECT = cn(inputVariants(), FIELD)
const LABEL = "mb-1.5 block text-m-body font-semibold text-ink"

export function FreightClassCalculator() {
  const [pieces, setPieces] = useState<PieceInput[]>([{ ...BLANK }])
  const [touched, setTouched] = useState(false)

  const update = (index: number, field: keyof PieceInput, value: string) => {
    setPieces((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setTouched(true)
  }

  const result = useMemo(() => {
    const parsed: Piece[] = []
    for (const piece of pieces) {
      const lengthIn = Number(piece.lengthIn)
      const widthIn = Number(piece.widthIn)
      const heightIn = Number(piece.heightIn)
      const weightLbs = Number(piece.weightLbs)
      const quantity = Number(piece.quantity)
      if (![lengthIn, widthIn, heightIn, weightLbs].every((n) => Number.isFinite(n) && n > 0)) return null
      if (!Number.isInteger(quantity) || quantity < 1) return null
      parsed.push({ lengthIn, widthIn, heightIn, weightLbs, quantity })
    }
    if (parsed.length === 0) return null
    try {
      return classifyShipment(parsed)
    } catch {
      return null
    }
  }, [pieces])

  const rows: { label: string; value: string }[] = result
    ? [
        { label: "Density", value: `${result.densityLbsPerCubicFoot} lb/ft³` },
        { label: "Total cube", value: `${result.cubicFeet} ft³` },
        { label: "Total weight", value: `${result.totalWeightLbs.toLocaleString()} lbs` },
        { label: "Pieces", value: String(result.pieceCount) },
        { label: "Bracket", value: result.bracket },
      ]
    : []

  return (
    <div className="rounded-m-3 border border-ink/15 bg-paper p-6 text-ink">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/10">
          <Boxes className="h-5 w-5 text-signal" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-m-h4 font-bold text-ink">Your shipment</h3>
          <p className="mt-1 max-w-measure text-m-body text-ink-2">
            Use outside dimensions including the pallet, and gross weight including packaging — that
            is what the carrier measures at the dock.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="space-y-5">
            {pieces.map((piece, index) => (
              <div key={index} className="rounded-m-2 border border-ink/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                    {pieces.length > 1 ? `Piece ${index + 1}` : "Pallet or piece"}
                  </p>
                  {pieces.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPieces((prev) => prev.filter((_, i) => i !== index))}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-m-body font-semibold text-ink-2 underline-offset-4 hover:text-signal hover:underline"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remove
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <label className={LABEL} htmlFor={`pallet-${index}`}>
                    Pallet footprint
                  </label>
                  <select
                    id={`pallet-${index}`}
                    className={SELECT}
                    value={`${piece.lengthIn}x${piece.widthIn}`}
                    onChange={(e) => {
                      const [l, w] = e.target.value.split("x")
                      setPieces((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, lengthIn: l, widthIn: w } : p))
                      )
                      setTouched(true)
                    }}
                  >
                    {STANDARD_PALLETS.map((p) => (
                      <option key={p.label} value={`${p.lengthIn}x${p.widthIn}`}>
                        {p.label}
                      </option>
                    ))}
                    <option value={`${piece.lengthIn}x${piece.widthIn}`}>Custom (set below)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div>
                    <label className={LABEL} htmlFor={`len-${index}`}>
                      Length (in)
                    </label>
                    <Input
                      id={`len-${index}`}
                      className={FIELD}
                      inputMode="decimal"
                      value={piece.lengthIn}
                      onChange={(e) => update(index, "lengthIn", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor={`wid-${index}`}>
                      Width (in)
                    </label>
                    <Input
                      id={`wid-${index}`}
                      className={FIELD}
                      inputMode="decimal"
                      value={piece.widthIn}
                      onChange={(e) => update(index, "widthIn", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor={`hgt-${index}`}>
                      Height (in)
                    </label>
                    <Input
                      id={`hgt-${index}`}
                      className={FIELD}
                      inputMode="decimal"
                      value={piece.heightIn}
                      onChange={(e) => update(index, "heightIn", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor={`wgt-${index}`}>
                      Weight (lbs)
                    </label>
                    <Input
                      id={`wgt-${index}`}
                      className={FIELD}
                      inputMode="decimal"
                      placeholder="800"
                      value={piece.weightLbs}
                      onChange={(e) => update(index, "weightLbs", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor={`qty-${index}`}>
                      Quantity
                    </label>
                    <Input
                      id={`qty-${index}`}
                      className={FIELD}
                      inputMode="numeric"
                      value={piece.quantity}
                      onChange={(e) => update(index, "quantity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPieces((prev) => [...prev, { ...BLANK }])}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-signal underline-offset-4 hover:underline"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add another piece
          </button>
        </div>

        {/* The instrument: hairline frame, mono tabular figures. */}
        <div className="h-fit rounded-m-2 border border-ink/15 p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-signal" aria-hidden />
            <h3 className="font-display text-m-h4 font-bold text-ink">Your class</h3>
          </div>

          {!result ? (
            <p className="mt-4 max-w-measure text-m-body text-ink-2">
              {touched
                ? "Fill in every dimension, a weight over zero, and a whole-number quantity."
                : "Enter a weight to see the class."}
            </p>
          ) : (
            <>
              <p className="mt-4 font-mono text-m-h1 font-bold tabular-nums text-ink">
                {`Class ${result.freightClass}`}
              </p>
              <p className="mt-1 max-w-measure text-m-body text-ink-2">
                {CLASS_HINT[String(result.freightClass)]}
              </p>

              <dl className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-m-body text-ink-2">{row.label}</dt>
                    <dd className="text-right font-mono text-m-body font-bold tabular-nums text-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {result.poundsToNextLowerClass !== null && (
                <p className="mt-4 rounded-m-2 border border-ink/15 p-3 text-m-body text-ink-2">
                  <span>Adding </span>
                  <strong className="font-mono tabular-nums text-ink">
                    {`${result.poundsToNextLowerClass.toLocaleString()} lbs`}
                  </strong>
                  <span>
                    {" "}
                    in the same cube would move this to the next class down — often cheaper per
                    pound. Worth checking before you split a shipment.
                  </span>
                </p>
              )}

              <p className="mt-4 flex gap-2 text-m-body text-ink-3">
                <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <span>{result.caveat}</span>
              </p>

              {/* hover:text-white is not decoration: the global
                  `a:hover { color: var(--brand-accent-strong) }` beats the
                  primitive's .text-white, which would paint the label signal
                  red on the darkened red fill (2.33:1) while hovered. */}
              <Button asChild size="lg" className="mt-5 w-full hover:text-white">
                <Link
                  href="/shippers#quote"
                  onClick={() => track("freight_class_to_quote", { class: String(result.freightClass) })}
                >
                  Get this quoted
                </Link>
              </Button>
              <p className="mt-2 max-w-measure text-center text-m-body text-ink-2">
                Truckload too — we run flatbed, reefer, and dry van.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
