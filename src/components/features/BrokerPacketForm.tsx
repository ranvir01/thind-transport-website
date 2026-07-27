"use client"

/**
 * Carrier-packet request — the broker door.
 *
 * A broker's question is not "what do you charge", it's "can I onboard you
 * today and will you actually cover the load". So this asks for the minimum
 * needed to send a packet and get set up in their system, and nothing else.
 *
 * Submits through the same captureLead action as the driver and shipper forms,
 * so every request lands in hub.website_leads source-tagged and shows up on the
 * hub's Today screen and /hub/leads with tap-to-call.
 */
import { useState } from "react"
import { Loader2, FileDown } from "lucide-react"
import { captureLead } from "@/app/actions/capture-lead"
import { COMPANY_INFO } from "@/lib/constants"
import { ATTRIBUTION_FIELD } from "@/lib/attribution"
import { AttributionField } from "@/components/shared/AttributionField"

export function BrokerPacketForm() {
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
    fd.append("name", String(data.get("contact") || ""))
    fd.append("email", String(data.get("email") || ""))
    fd.append("phone", String(data.get("phone") || ""))
    fd.append("source", "Broker — carrier packet request")
    fd.append(
      "message",
      [
        data.get("brokerage") ? `Brokerage: ${data.get("brokerage")}` : "",
        data.get("mc") ? `Their MC: ${data.get("mc")}` : "",
        data.get("lanes") ? `Lanes/equipment: ${data.get("lanes")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )

    setState("sending")
    const result = await captureLead({ success: false, message: "" }, fd)
    if (result.success) {
      setState("done")
      form.reset()
    } else {
      setErrorMsg(result.message)
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-m-3 border border-cedar/30 bg-cedar/5 p-6 text-center">
        <p className="font-display text-m-h4 font-bold text-ink">Packet on its way.</p>
        <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
          W-9, certificate of insurance and our authority are headed to your inbox. Need a truck
          covered today rather than tomorrow? Call dispatch on{" "}
          <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-signal">
            {COMPANY_INFO.phone}
          </a>
          .
        </p>
      </div>
    )
  }

  const field =
    "mt-1.5 h-11 w-full rounded-m-2 border border-ink/20 bg-white px-3 text-m-body text-ink " +
    "transition-colors duration-fast ease-entrance placeholder:text-ink-3 " +
    "focus:border-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
  const label = "font-display text-m-micro font-bold uppercase tracking-[0.12em] text-ink-3"

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <AttributionField />
      <div className="sm:col-span-2">
        <label className={label} htmlFor="brokerage">
          Brokerage
        </label>
        <input id="brokerage" name="brokerage" required className={field} placeholder="Acme Logistics" />
      </div>

      <div>
        <label className={label} htmlFor="contact">
          Your name
        </label>
        <input id="contact" name="contact" required className={field} placeholder="Jordan Reyes" />
      </div>

      <div>
        <label className={label} htmlFor="mc">
          Your MC number <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input id="mc" name="mc" className={field} placeholder="MC-123456" />
      </div>

      <div>
        <label className={label} htmlFor="email">
          Email for the packet
        </label>
        <input id="email" name="email" type="email" required className={field} placeholder="you@brokerage.com" />
      </div>

      <div>
        <label className={label} htmlFor="phone">
          Phone
        </label>
        <input id="phone" name="phone" type="tel" required className={field} placeholder="(555) 555-5555" />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="lanes">
          Lanes and equipment you need covered
        </label>
        <input
          id="lanes"
          name="lanes"
          className={field}
          placeholder="PNW to CA, reefer — weekly"
        />
      </div>

      {state === "error" && (
        <p role="alert" className="sm:col-span-2 text-m-body text-signal">
          {errorMsg || `That didn't send. Call or text ${COMPANY_INFO.phone} and we'll get the packet to you.`}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="sm:col-span-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-m-2 bg-signal px-6 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-ink disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {state === "sending" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        Send me the carrier packet
      </button>
    </form>
  )
}
