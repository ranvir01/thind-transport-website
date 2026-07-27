"use client"

/**
 * Public LTL freight-class calculator.
 *
 * The classification math lives in @/lib/hub/freight-class and is unit-tested
 * against the NMFTA density table; this component is the form around it. It is
 * a lead magnet on purpose — a shipper who works out their class here is a
 * shipper with freight to move, so the result panel hands off to the quote
 * form with the shipment already described.
 */
import { useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, Calculator, Info, Plus, Trash2 } from "lucide-react"
import { track } from "@vercel/analytics"
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

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
  const label = "block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5"

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Boxes className="h-5 w-5 text-orange-600" aria-hidden />
          <h2 className="text-lg font-bold text-gray-900">Your shipment</h2>
        </div>

        <div className="space-y-5">
          {pieces.map((piece, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  {pieces.length > 1 ? `Piece ${index + 1}` : "Pallet or piece"}
                </p>
                {pieces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPieces((prev) => prev.filter((_, i) => i !== index))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className={label} htmlFor={`pallet-${index}`}>
                  Pallet footprint
                </label>
                <select
                  id={`pallet-${index}`}
                  className={field}
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

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className={label} htmlFor={`len-${index}`}>Length (in)</label>
                  <input id={`len-${index}`} className={field} inputMode="decimal" value={piece.lengthIn}
                    onChange={(e) => update(index, "lengthIn", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor={`wid-${index}`}>Width (in)</label>
                  <input id={`wid-${index}`} className={field} inputMode="decimal" value={piece.widthIn}
                    onChange={(e) => update(index, "widthIn", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor={`hgt-${index}`}>Height (in)</label>
                  <input id={`hgt-${index}`} className={field} inputMode="decimal" value={piece.heightIn}
                    onChange={(e) => update(index, "heightIn", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor={`wgt-${index}`}>Weight (lbs)</label>
                  <input id={`wgt-${index}`} className={field} inputMode="decimal" placeholder="800"
                    value={piece.weightLbs} onChange={(e) => update(index, "weightLbs", e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor={`qty-${index}`}>Quantity</label>
                  <input id={`qty-${index}`} className={field} inputMode="numeric" value={piece.quantity}
                    onChange={(e) => update(index, "quantity", e.target.value)} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Use outside dimensions including the pallet, and gross weight including packaging — that is
                what the carrier measures.
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPieces((prev) => [...prev, { ...BLANK }])}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:border-orange-500 hover:text-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add another piece
        </button>
      </div>

      {/* Result */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-orange-600" aria-hidden />
            <h2 className="text-lg font-bold text-gray-900">Your class</h2>
          </div>

          {!result ? (
            <p className="text-gray-600">
              {touched
                ? "Fill in every dimension, a weight over zero, and a whole-number quantity."
                : "Enter a weight to see the class."}
            </p>
          ) : (
            <>
              <p className="text-5xl font-extrabold tracking-tight text-gray-900">
                Class {result.freightClass}
              </p>
              <p className="mt-1 text-gray-700">{CLASS_HINT[String(result.freightClass)]}</p>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Density</dt>
                  <dd className="font-semibold text-gray-900">{result.densityLbsPerCubicFoot} lb/ft³</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Total cube</dt>
                  <dd className="font-semibold text-gray-900">{result.cubicFeet} ft³</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Total weight</dt>
                  <dd className="font-semibold text-gray-900">
                    {result.totalWeightLbs.toLocaleString()} lbs
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Pieces</dt>
                  <dd className="font-semibold text-gray-900">{result.pieceCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Bracket</dt>
                  <dd className="font-semibold text-gray-900 text-right">{result.bracket}</dd>
                </div>
              </dl>

              {result.poundsToNextLowerClass !== null && (
                <p className="mt-4 rounded-xl bg-white border border-gray-200 p-3 text-sm text-gray-700">
                  Adding <strong>{result.poundsToNextLowerClass.toLocaleString()} lbs</strong> in the same
                  cube would move this to the next class down — often cheaper per pound. Worth checking
                  before you split a shipment.
                </p>
              )}

              <p className="mt-4 flex gap-2 text-xs text-gray-600">
                <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{result.caveat}</span>
              </p>

              <Link
                href="/shippers#quote"
                onClick={() => track("freight_class_to_quote", { class: String(result.freightClass) })}
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700"
              >
                Get this quoted
              </Link>
              <p className="mt-2 text-center text-xs text-gray-600">
                Truckload too — we run flatbed, reefer, and dry van out of Kent, WA.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
