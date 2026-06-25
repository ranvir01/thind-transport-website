"use client"

import { useEffect, useMemo, useState } from "react"
import { consumePasteBuffer } from "@/lib/hub/doc-intake/extract-text-client"
import { ClipboardPaste, Sparkles } from "lucide-react"
import { parseRateCon, type ParsedRateCon, type Confidence } from "@/lib/hub/parser"
import { fieldCls, Panel } from "@/components/hub/ui"
import { LoadForm, type LoadFormInitial, type Option, type PriceBookOption } from "@/components/hub/LoadForm"
import { emptyLoadForm } from "@/lib/hub/form-defaults"

const CONFIDENCE_CLS: Record<Confidence, string> = {
  high: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
  medium: "border-gold/40 bg-gold/15 text-gold",
  low: "border-red-400/40 bg-red-500/15 text-red-300",
}

function Chip({ label, confidence }: { label: string; confidence: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${CONFIDENCE_CLS[confidence]}`}>
      {label}
    </span>
  )
}

function toDatetimeLocal(date: string | undefined): string {
  if (!date) return ""
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T08:00`
}

export function PasteIntake({
  customers,
  drivers,
  trucks,
  trailers,
  priceBook,
}: {
  customers: (Option & { mc?: string | null })[]
  drivers: Option[]
  trucks: Option[]
  trailers: Option[]
  priceBook: PriceBookOption[]
}) {
  const [text, setText] = useState("")
  const [parsed, setParsed] = useState<ParsedRateCon | null>(null)

  useEffect(() => {
    const buffered = consumePasteBuffer()
    if (buffered) {
      setText(buffered)
      setParsed(parseRateCon(buffered))
    }
  }, [])

  const initial: LoadFormInitial | null = useMemo(() => {
    if (!parsed) return null
    const base = emptyLoadForm()

    // Match broker: by MC first, then case-insensitive name containment
    let customerId = ""
    if (parsed.mcNumber) {
      customerId = customers.find((c) => c.mc && c.mc.replace(/\D/g, "") === parsed.mcNumber!.value)?.id ?? ""
    }
    if (!customerId && parsed.brokerName) {
      const target = parsed.brokerName.value.toLowerCase()
      customerId = customers.find(
        (c) => target.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(target.split(/\s+/)[0])
      )?.id ?? ""
    }

    const stops = parsed.stops.length >= 2
      ? parsed.stops.map((s) => ({
          type: s.type, facility: "", address: "", city: s.city, state: s.state, zip: "",
          pickup_number: "", po_number: "", fcfs: !s.date, appt_start: toDatetimeLocal(s.date), notes: "",
        }))
      : base.stops

    return {
      ...base,
      customer_id: customerId,
      customer_reference: parsed.reference?.value ?? "",
      equipment: parsed.equipment?.value ?? "dry_van",
      commodity: parsed.commodity?.value ?? "",
      weight_lbs: parsed.weightLbs ? String(parsed.weightLbs.value) : "",
      linehaul: parsed.linehaulCents ? (parsed.linehaulCents.value / 100).toFixed(2) : "",
      fuel_surcharge: parsed.fuelSurchargeCents ? (parsed.fuelSurchargeCents.value / 100).toFixed(2) : "",
      stops,
    }
  }, [parsed, customers])

  return (
    <div className="space-y-4">
      <Panel className="p-4 md:p-5">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-1">
          Paste the rate confirmation
        </h2>
        <p className="text-body-sm text-steel-200 mb-3">
          Copy the text of the rate con (from the email or the PDF) and paste it here — the parser pre-fills the load,
          you confirm. Booked in under a minute.
        </p>
        <textarea
          rows={8}
          placeholder={"PACIFIC CREST LOGISTICS  MC# 784512\nLoad # PCL-99120\nPICKUP: Kent, WA 06/12/2026 08:00\nDELIVERY: Fresno, CA 06/14/2026\nLinehaul: $3,200.00  FSC: $350.00 …"}
          className={`${fieldCls} h-auto py-3 font-mono text-xs`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={() => setParsed(parseRateCon(text))}
          disabled={!text.trim()}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-orange px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> Parse it
        </button>

        {parsed ? (
          <div className="mt-4">
            <p className="text-label text-steel-300 uppercase mb-2">What the parser found (confidence-coded):</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.brokerName ? <Chip label={`Broker: ${parsed.brokerName.value}`} confidence={parsed.brokerName.confidence} /> : null}
              {parsed.mcNumber ? <Chip label={`MC ${parsed.mcNumber.value}`} confidence={parsed.mcNumber.confidence} /> : null}
              {parsed.reference ? <Chip label={`Ref ${parsed.reference.value}`} confidence={parsed.reference.confidence} /> : null}
              {parsed.linehaulCents ? <Chip label={`Linehaul $${(parsed.linehaulCents.value / 100).toFixed(2)}`} confidence={parsed.linehaulCents.confidence} /> : null}
              {parsed.fuelSurchargeCents ? <Chip label={`FSC $${(parsed.fuelSurchargeCents.value / 100).toFixed(2)}`} confidence={parsed.fuelSurchargeCents.confidence} /> : null}
              {parsed.equipment ? <Chip label={parsed.equipment.value.replace("_", " ")} confidence={parsed.equipment.confidence} /> : null}
              {parsed.weightLbs ? <Chip label={`${parsed.weightLbs.value.toLocaleString()} lbs`} confidence={parsed.weightLbs.confidence} /> : null}
              {parsed.stops.map((s, i) => (
                <Chip key={i} label={`${s.type === "pickup" ? "PU" : "DEL"}: ${s.city}, ${s.state}`} confidence={s.confidence} />
              ))}
              {parsed.stops.length === 0 ? <Chip label="No stops found — fill them below" confidence="low" /> : null}
            </div>
          </div>
        ) : null}
      </Panel>

      {parsed && initial ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardPaste className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
              Confirm &amp; book
            </h2>
          </div>
          <LoadForm
            initial={initial}
            customers={customers}
            drivers={drivers}
            trucks={trucks}
            trailers={trailers}
            priceBook={priceBook}
          />
        </div>
      ) : null}
    </div>
  )
}
