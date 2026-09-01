"use client"

import { useMemo, useState } from "react"
import { consumePasteBuffer } from "@/lib/hub/doc-intake/extract-text-client"
import { ClipboardPaste, Sparkles } from "lucide-react"
import { parseRateCon, type ParsedRateCon, type Confidence } from "@/lib/hub/parser"
import { fieldCls, Panel } from "@/components/hub/ui"
import { LoadForm, type LoadFormInitial, type Option, type PriceBookOption } from "@/components/hub/LoadForm"
import { rateConToLoadForm } from "@/lib/hub/rate-con-to-form"

const CONFIDENCE_CLS: Record<Confidence, string> = {
  high: "border-ok-soft bg-ok-soft text-ok",
  medium: "border-warn-soft bg-warn-soft text-warn",
  low: "border-bad-soft bg-bad-soft text-bad",
}

function Chip({ label, confidence }: { label: string; confidence: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${CONFIDENCE_CLS[confidence]}`}>
      {label}
    </span>
  )
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
  const [{ text, parsed }, setPasteState] = useState(() => {
    const buffered = consumePasteBuffer()
    if (!buffered) return { text: "", parsed: null as ParsedRateCon | null }
    return { text: buffered, parsed: parseRateCon(buffered) }
  })
  const setText = (next: string) => setPasteState((s) => ({ ...s, text: next }))
  const setParsed = (next: ParsedRateCon | null) => setPasteState((s) => ({ ...s, parsed: next }))

  // The ParsedRateCon → form mapping lives in lib/hub/rate-con-to-form so the
  // Inbox (emailed rate cons) prefills through exactly the same translation.
  const initial: LoadFormInitial | null = useMemo(
    () => (parsed ? rateConToLoadForm(parsed, customers) : null),
    [parsed, customers]
  )

  return (
    <div className="space-y-4">
      <Panel className="p-4 md:p-5">
        <h2 className="text-[13.5px] font-semibold text-fg mb-1">
          Paste the rate confirmation
        </h2>
        <p className="text-body-sm text-fg-2 mb-3">
          Copy the text of the rate con (from the email or the PDF) and paste it here — the parser pre-fills the load,
          you confirm. Booked in under a minute.
        </p>
        <textarea
          rows={8}
          placeholder={"PACIFIC CREST LOGISTICS  MC# 784512\nLoad # PCL-99120\nPICKUP: Kent, WA 06/12/2026 08:00\nDELIVERY: Fresno, CA 06/14/2026\nLinehaul: $3,200.00  FSC: $350.00 …"}
          className={`${fieldCls} h-auto py-3 font-mono text-base md:text-xs`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={() => setParsed(parseRateCon(text))}
          disabled={!text.trim()}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> Parse it
        </button>

        {parsed ? (
          <div className="mt-4">
            <p className="text-label text-fg-3 uppercase mb-2">What the parser found (confidence-coded):</p>
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
            <ClipboardPaste className="h-4 w-4 text-accent-text" />
            <h2 className="text-base font-semibold text-fg">
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
