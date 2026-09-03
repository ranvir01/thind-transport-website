"use client"

/**
 * Freight quote request — the shipper/broker counterpart to the driver apply
 * flow. Submits through the same captureLead action, so every request lands
 * in hub.website_leads (source-tagged) and surfaces on the hub's Today
 * screen and /hub/leads with tap-to-call.
 *
 * Every state of this widget (the form, its success card) renders as one
 * paper island on the dark page ground, so the pages that mount it add no
 * wrapper of their own. scripts/e2e-funnel-smoke.mjs drives this form by its
 * field names, the "Request a quote" button and the "Quote request received"
 * success copy — all three are pinned.
 */
import { useState } from "react"
import { Loader2, MapPin, Send } from "lucide-react"
import { captureLead } from "@/app/actions/capture-lead"
import { COMPANY_INFO } from "@/lib/constants"
import { HONEYPOT_FIELD } from "@/lib/honeypot"
import { track } from "@vercel/analytics"
import { HoneypotField } from "@/components/shared/HoneypotField"
import { AttributionField } from "@/components/shared/AttributionField"
import { ATTRIBUTION_FIELD } from "@/lib/attribution"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const ISLAND = "rounded-m-3 border border-ink/15 bg-paper p-6 text-ink"
/** The Input/Textarea primitives retinted for paper. Input runs its classes
 *  through cn(), so twMerge drops its `bg-white` / `text-neutral-900` outright.
 *  Textarea concatenates instead, so those two survive into the rendered class
 *  list — and inside `.brand-page-shell` the dark remap (globals.css) matches
 *  them with a two-class descendant selector, which outranks the plain
 *  `bg-paper` / `text-ink` utilities and turns that one field navy. The
 *  shell-scoped pair below matches that specificity from the utilities layer
 *  (later in the sheet, so it wins) and carries the important modifier the
 *  colour remap forces. Remove both once Textarea uses cn() like Input.
 *  shadow-none because this island is border-led (DIRECTION.md §10) — the
 *  primitive's shadow-sm is the app default, not a marketing surface. */
const FIELD =
  "border-ink/20 bg-paper text-ink shadow-none placeholder:text-ink-3 hover:border-ink/40 [.brand-page-shell_&]:bg-paper [.brand-page-shell_&]:!text-ink"
const LABEL = "mb-1.5 block text-m-body font-semibold text-ink"

/**
 * `defaultLane` carries a lane over from the transit estimator (/quote?lane=…)
 * so a visitor who just priced out Kent → Denver doesn't retype it.
 */
export function ShipperQuoteForm({ defaultLane }: { defaultLane?: string } = {}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const fd = new FormData()
    // These forms rebuild FormData field by field rather than passing the
    // form's own, so anything not explicitly copied is dropped — which is
    // exactly how attribution reached the server as null the first time.
    const attribution = data.get(ATTRIBUTION_FIELD)
    if (typeof attribution === "string" && attribution) fd.append(ATTRIBUTION_FIELD, attribution)
    const hp = data.get(HONEYPOT_FIELD)
    if (typeof hp === "string" && hp) fd.append(HONEYPOT_FIELD, hp)
    fd.append("name", String(data.get("contact") || ""))
    fd.append("email", String(data.get("email") || ""))
    fd.append("phone", String(data.get("phone") || ""))
    fd.append("source", "Shipper/Broker quote request")
    fd.append(
      "message",
      [
        data.get("company") ? `Company: ${data.get("company")}` : "",
        data.get("lane") ? `Lane: ${data.get("lane")}` : "",
        data.get("details") ? `Details: ${data.get("details")}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    )
    setState("sending")
    try {
      const result = await captureLead({ success: false, message: "" }, fd)
      if (result.success) {
        track("shipper_quote_submit")
        setState("done")
      } else {
        setErrorMsg(result.message)
        setState("error")
      }
    } catch {
      setErrorMsg(`Call ${COMPANY_INFO.phone} and we'll quote you directly.`)
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className={`${ISLAND} text-center`}>
        <p className="font-display text-m-h4 font-bold text-ink">Quote request received.</p>
        <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
          <span>Dispatch will get back to you within business hours — usually much faster. Need it now? </span>
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="font-semibold text-signal underline-offset-4 hover:underline"
          >
            <span>Call </span>
            <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
          </a>
          <span>.</span>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`${ISLAND} relative grid grid-cols-1 gap-4 sm:grid-cols-2`}>
      <HoneypotField />
      <AttributionField />
      {/* The lane the visitor just priced in the estimator. Inside the island,
          not above it: ink type on the dark page ground would vanish. */}
      {defaultLane ? (
        <p className="flex items-start gap-2 rounded-m-2 border border-signal/25 bg-signal/5 px-4 py-3 text-m-body text-ink sm:col-span-2">
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden />
          <span>
            <span>Lane carried over from the estimator: </span>
            <strong>{defaultLane}</strong>
          </span>
        </p>
      ) : null}
      <div>
        <label htmlFor="quote-company" className={LABEL}>Company</label>
        <Input id="quote-company" name="company" autoComplete="organization" required placeholder="Company / Brokerage *" className={FIELD} aria-label="Company" />
      </div>
      <div>
        <label htmlFor="quote-contact" className={LABEL}>Contact name</label>
        <Input id="quote-contact" name="contact" autoComplete="name" required placeholder="Contact name *" className={FIELD} aria-label="Contact name" />
      </div>
      <div>
        <label htmlFor="quote-email" className={LABEL}>Email</label>
        <Input id="quote-email" name="email" type="email" autoComplete="email" required placeholder="Work email *" className={FIELD} aria-label="Email" />
      </div>
      <div>
        <label htmlFor="quote-phone" className={LABEL}>Phone</label>
        <Input id="quote-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={10} placeholder="Phone *" className={FIELD} aria-label="Phone" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="quote-lane" className={LABEL}>Lane</label>
        <Input
          id="quote-lane"
          name="lane"
          defaultValue={defaultLane}
          placeholder="Lane (e.g. Seattle, WA → Boise, ID)"
          className={FIELD}
          aria-label="Lane"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="quote-details" className={LABEL}>Freight details</label>
        <Textarea
          id="quote-details"
          name="details"
          rows={3}
          placeholder="Freight details — commodity, weight, equipment, dates"
          className={FIELD}
          aria-label="Freight details"
        />
      </div>
      {state === "error" ? (
        <p role="alert" className="text-m-body text-signal sm:col-span-2">
          {errorMsg}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:col-span-2">
        {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        Request a quote
      </Button>
      <p className="text-center text-m-micro text-ink-2 sm:col-span-2">
        Direct to dispatch — no forms disappearing into a queue.
      </p>
    </form>
  )
}
