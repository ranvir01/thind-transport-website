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
 *
 * Every state of this widget (the form, its success card) renders as one paper
 * island on the dark page ground, the same grammar as ShipperQuoteForm, so
 * /brokers mounts it with no wrapper of its own. Fields go through the shared
 * Input primitive — 16px on touch, rounded-fleet, one focus outline from
 * globals.css — retinted for paper so nothing is left for the page shell to
 * remap. No delivery-time promise appears anywhere: how fast the office
 * actually sends a packet is not something this repo can substantiate.
 */
import { useState } from "react"
import { Loader2, FileDown } from "lucide-react"
import { captureLead } from "@/app/actions/capture-lead"
import { COMPANY_INFO } from "@/lib/constants"
import { ATTRIBUTION_FIELD } from "@/lib/attribution"
import { AttributionField } from "@/components/shared/AttributionField"
import { HoneypotField } from "@/components/shared/HoneypotField"
import { HONEYPOT_FIELD } from "@/lib/honeypot"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ISLAND = "rounded-m-3 border border-ink/15 bg-paper p-6 text-ink"
/** The Input primitive retinted for paper: twMerge swaps its neutral tokens
 *  for ink, so no `bg-white` is left for the page shell to remap. shadow-none
 *  because this island is border-led (DIRECTION.md §10). */
const FIELD = "border-ink/20 bg-paper text-ink shadow-none placeholder:text-ink-3 hover:border-ink/40"
const LABEL = "mb-1.5 block text-m-body font-semibold text-ink"

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
    const hp = data.get(HONEYPOT_FIELD)
    if (typeof hp === "string" && hp) fd.append(HONEYPOT_FIELD, hp)
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
      <div className={`${ISLAND} text-center`}>
        <p className="font-display text-m-h4 font-bold text-ink">Packet on its way.</p>
        <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
          <span>
            W-9, certificate of insurance and our authority are headed to your inbox. Need a truck
            covered today rather than tomorrow? Call dispatch on{" "}
          </span>
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="font-semibold text-signal underline-offset-4 hover:underline"
          >
            <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
          </a>
          <span>.</span>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`${ISLAND} grid gap-4 sm:grid-cols-2`}>
      <HoneypotField />
      <AttributionField />

      <div className="sm:col-span-2">
        <h3 className="font-display text-m-h4 font-bold text-ink">Full signed packet</h3>
        <p className="mt-1.5 max-w-measure text-m-body text-ink-2">
          W-9, certificate of insurance and the carrier agreement, sent to the address you give us.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor="broker-brokerage">
          Brokerage
        </label>
        <Input
          id="broker-brokerage"
          name="brokerage"
          autoComplete="organization"
          required
          className={FIELD}
          placeholder="Acme Logistics"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="broker-contact">
          Your name
        </label>
        <Input
          id="broker-contact"
          name="contact"
          autoComplete="name"
          required
          className={FIELD}
          placeholder="Jordan Reyes"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="broker-mc">
          Your MC number (optional)
        </label>
        <Input id="broker-mc" name="mc" className={FIELD} placeholder="MC-123456" />
      </div>

      <div>
        <label className={LABEL} htmlFor="broker-email">
          Email for the packet
        </label>
        <Input
          id="broker-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={FIELD}
          placeholder="you@brokerage.com"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="broker-phone">
          Phone
        </label>
        <Input
          id="broker-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          className={FIELD}
          placeholder="(555) 555-5555"
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL} htmlFor="broker-lanes">
          Lanes and equipment you need covered
        </label>
        <Input
          id="broker-lanes"
          name="lanes"
          className={FIELD}
          placeholder="PNW to CA, reefer — weekly"
        />
      </div>

      {state === "error" && (
        <p role="alert" className="text-m-body text-signal sm:col-span-2">
          {errorMsg || `That didn't send. Call or text ${COMPANY_INFO.phone} and we'll get the packet to you.`}
        </p>
      )}

      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:col-span-2">
        {state === "sending" ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <FileDown className="h-5 w-5" aria-hidden />
        )}
        Send me the carrier packet
      </Button>
    </form>
  )
}
