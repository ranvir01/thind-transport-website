import { parseRateCon } from "../parser"
import { classifyDocument } from "./classify"
import {
  classifySpreadsheet,
  parseCdl,
  parseCoi,
  parseCustomerDoc,
  parseMedCard,
  parseRegistration,
  parseW9,
} from "./parsers"
import type { DocAnalysis, DocKind, ParsedDocPayload } from "./types"
import { DOC_KIND_LABELS } from "./types"

export { classifyDocument } from "./classify"
export * from "./parsers"
export * from "./types"

function summarizePayload(kind: DocKind, payload: ParsedDocPayload): string[] {
  const chips: string[] = []
  const push = (label: string, val?: { value: unknown }) => {
    if (val?.value != null && val.value !== "") chips.push(`${label}: ${val.value}`)
  }

  switch (payload.kind) {
    case "rate_con": {
      const d = payload.data
      push("Broker", d.brokerName)
      push("MC", d.mcNumber)
      push("Ref", d.reference)
      if (d.linehaulCents) chips.push(`Linehaul: $${(d.linehaulCents.value / 100).toFixed(2)}`)
      chips.push(`${d.stops.length} stop(s) found`)
      break
    }
    case "customer": {
      const d = payload.data
      push("Name", d.name)
      push("MC", d.mcNumber)
      push("DOT", d.dotNumber)
      push("Billing", d.billingEmail)
      if (d.paymentTermsDays) chips.push(`Net ${d.paymentTermsDays.value}`)
      break
    }
    case "registration": {
      const d = payload.data
      push("Unit", d.unitNumber)
      push("VIN", d.vin)
      push("Plate", d.plate)
      push("Expires", d.registrationExpiry)
      break
    }
    case "cdl": {
      const d = payload.data
      if (d.firstName && d.lastName) chips.push(`Name: ${d.firstName.value} ${d.lastName.value}`)
      push("CDL #", d.cdlNumber)
      push("State", d.cdlState)
      push("Expires", d.cdlExpiry)
      break
    }
    case "med_card": {
      const d = payload.data
      if (d.firstName && d.lastName) chips.push(`Name: ${d.firstName.value} ${d.lastName.value}`)
      push("Expires", d.medicalCardExpiry)
      break
    }
    case "w9": {
      const d = payload.data
      push("Business", d.businessName)
      push("EIN", d.ein)
      break
    }
    case "coi": {
      const d = payload.data
      push("Insured", d.insuredName)
      push("Policy", d.policyNumber)
      push("Expires", d.expiry)
      break
    }
    case "spreadsheet":
      chips.push(`Import as: ${payload.data.hint}`)
      break
    case "unknown":
      chips.push(payload.data.preview.slice(0, 120) + (payload.data.preview.length > 120 ? "…" : ""))
      break
  }

  return chips.length ? chips : ["No fields extracted — paste text or try a clearer scan"]
}

/** Full pipeline: classify → parse → human-readable summary. Pure — safe on server or client. */
export function analyzeDocument(text: string, fileName?: string): DocAnalysis {
  const trimmed = text.trim()
  const kind = classifyDocument(trimmed, fileName)

  let payload: ParsedDocPayload
  switch (kind) {
    case "rate_con":
      payload = { kind: "rate_con", data: parseRateCon(trimmed) }
      break
    case "customer":
      payload = { kind: "customer", data: parseCustomerDoc(trimmed) }
      break
    case "registration":
      payload = { kind: "registration", data: parseRegistration(trimmed) }
      break
    case "cdl":
      payload = { kind: "cdl", data: parseCdl(trimmed) }
      break
    case "med_card":
      payload = { kind: "med_card", data: parseMedCard(trimmed) }
      break
    case "w9":
      payload = { kind: "w9", data: parseW9(trimmed) }
      break
    case "coi":
      payload = { kind: "coi", data: parseCoi(trimmed) }
      break
    case "spreadsheet":
      payload = { kind: "spreadsheet", data: { hint: classifySpreadsheet(trimmed) } }
      break
    default:
      payload = { kind: "unknown", data: { preview: trimmed.slice(0, 500) } }
  }

  return {
    kind,
    label: DOC_KIND_LABELS[kind],
    payload,
    summary: summarizePayload(kind, payload),
  }
}
