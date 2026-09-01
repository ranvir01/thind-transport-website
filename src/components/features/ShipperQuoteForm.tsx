"use client"

/**
 * Freight quote request — the shipper/broker counterpart to the driver apply
 * flow. Submits through the same captureLead action, so every request lands
 * in hub.website_leads (source-tagged) and surfaces on the hub's Today
 * screen and /hub/leads with tap-to-call.
 */
import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { captureLead } from "@/app/actions/capture-lead"
import { COMPANY_INFO } from "@/lib/constants"
import { HONEYPOT_FIELD } from "@/lib/honeypot"
import { track } from "@vercel/analytics"
import { HoneypotField } from "@/components/shared/HoneypotField"
import { AttributionField } from "@/components/shared/AttributionField"
import { ATTRIBUTION_FIELD } from "@/lib/attribution"

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
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-xl font-bold text-gray-900">Quote request received.</p>
        <p className="mt-2 text-gray-600">
          Dispatch will get back to you within business hours — usually much faster. Need it now?{" "}
          <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-orange-600">
            Call {COMPANY_INFO.phone}
          </a>
          .
        </p>
      </div>
    )
  }

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"

  return (
    <form onSubmit={onSubmit} className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
      <HoneypotField />
      <AttributionField />
      <input name="company" autoComplete="organization" required placeholder="Company / Brokerage *" className={field} aria-label="Company" />
      <input name="contact" autoComplete="name" required placeholder="Contact name *" className={field} aria-label="Contact name" />
      <input name="email" type="email" autoComplete="email" required placeholder="Work email *" className={field} aria-label="Email" />
      <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={10} placeholder="Phone *" className={field} aria-label="Phone" />
      <input
        name="lane"
        defaultValue={defaultLane}
        placeholder="Lane (e.g. Seattle, WA → Boise, ID)"
        className={`${field} sm:col-span-2`}
        aria-label="Lane"
      />
      <textarea
        name="details"
        rows={3}
        placeholder="Freight details — commodity, weight, equipment, dates"
        className={`${field} sm:col-span-2`}
        aria-label="Freight details"
      />
      {state === "error" ? (
        <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMsg}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="sm:col-span-2 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
      >
        {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Request a quote
      </button>
      <p className="sm:col-span-2 text-center text-xs text-gray-500">
        Direct to dispatch — no forms disappearing into a queue.
      </p>
    </form>
  )
}
