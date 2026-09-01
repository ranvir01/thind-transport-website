/**
 * ParsedRateCon → LoadFormInitial, in one place.
 *
 * This mapping was inline in PasteIntake.tsx, which meant the paste path was
 * the only way a parsed rate con could become a prefilled load. The Inbox
 * (emailed rate cons) needs exactly the same translation, and two copies of
 * broker-matching heuristics would drift apart the first time either was
 * touched. Pure and dependency-free so both a client component and a test can
 * call it.
 */
import type { ParsedRateCon } from "./parser"
import type { LoadFormInitial } from "@/components/hub/LoadForm"
import { emptyLoadForm } from "./form-defaults"

/** Just enough of a customer to match a broker against. */
export interface BrokerOption {
  id: string
  label: string
  mc?: string | null
}

/**
 * Rate cons carry a date, not a time. 08:00 local is a placeholder the
 * dispatcher is expected to correct — never a real appointment.
 */
export function toDatetimeLocal(date: string | undefined): string {
  if (!date) return ""
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T08:00`
}

/**
 * Match the broker on the rate con to a customer on file: MC number first
 * (exact, digits only), then a loose name containment both ways so
 * "TQL" matches "Total Quality Logistics" and vice versa. Returns "" when
 * nothing matches — the dispatcher picks from the dropdown.
 */
export function matchBroker(parsed: ParsedRateCon, customers: BrokerOption[]): string {
  if (parsed.mcNumber) {
    const mc = parsed.mcNumber.value
    const byMc = customers.find((c) => c.mc && c.mc.replace(/\D/g, "") === mc)
    if (byMc) return byMc.id
  }
  if (parsed.brokerName) {
    const target = parsed.brokerName.value.toLowerCase()
    const firstWord = target.split(/\s+/)[0]
    const byName = customers.find(
      (c) => target.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(firstWord)
    )
    if (byName) return byName.id
  }
  return ""
}

/**
 * Everything the parser is confident enough to prefill. Fields it could not
 * read stay at their empty-form defaults rather than being guessed, so a blank
 * box always means "we did not find this" and never "we found nothing useful".
 */
export function rateConToLoadForm(parsed: ParsedRateCon, customers: BrokerOption[]): LoadFormInitial {
  const base = emptyLoadForm()

  // Fewer than two stops is not a lane — keep the empty pickup/delivery pair
  // so the form still renders something the dispatcher can fill in.
  const stops =
    parsed.stops.length >= 2
      ? parsed.stops.map((s) => ({
          type: s.type,
          facility: "",
          address: "",
          city: s.city,
          state: s.state,
          zip: "",
          pickup_number: "",
          po_number: "",
          fcfs: !s.date,
          appt_start: toDatetimeLocal(s.date),
          notes: "",
        }))
      : base.stops

  return {
    ...base,
    customer_id: matchBroker(parsed, customers),
    customer_reference: parsed.reference?.value ?? "",
    equipment: parsed.equipment?.value ?? "dry_van",
    commodity: parsed.commodity?.value ?? "",
    weight_lbs: parsed.weightLbs ? String(parsed.weightLbs.value) : "",
    linehaul: parsed.linehaulCents ? (parsed.linehaulCents.value / 100).toFixed(2) : "",
    fuel_surcharge: parsed.fuelSurchargeCents ? (parsed.fuelSurchargeCents.value / 100).toFixed(2) : "",
    stops,
  }
}

/**
 * The weakest confidence across the fields that actually matter for booking.
 * Stored on the draft so an auto-accept threshold can be introduced later
 * without a migration; nothing acts on it today.
 */
export function overallConfidence(parsed: ParsedRateCon): "high" | "medium" | "low" {
  const fields = [
    parsed.brokerName,
    parsed.reference,
    parsed.linehaulCents,
  ].filter(Boolean) as { confidence: "high" | "medium" | "low" }[]
  if (fields.length === 0) return "low"
  if (fields.some((f) => f.confidence === "low")) return "low"
  if (fields.some((f) => f.confidence === "medium")) return "medium"
  return parsed.stops.length >= 2 ? "high" : "medium"
}
