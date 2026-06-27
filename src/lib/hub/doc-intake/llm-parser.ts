/**
 * Optional LLM DocumentParser (Phase 6) — Anthropic Messages API.
 * Off when ANTHROPIC_API_KEY is unset; callers fall back to heuristics.
 */
import type { Confidence } from "../parser"
import { normalizeDate } from "./parsers"
import type { DocAnalysis, DocKind, ParsedDocPayload } from "./types"
import { DOC_KIND_LABELS } from "./types"
import { redactPiiForLlm } from "./pii"

const DOC_KINDS: DocKind[] = [
  "rate_con",
  "customer",
  "registration",
  "cdl",
  "med_card",
  "w9",
  "coi",
  "spreadsheet",
  "unknown",
]

export function aiParserConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

function field<T>(value: T | null | undefined, confidence: Confidence) {
  if (value == null || value === "") return undefined
  return { value, confidence }
}

function parseLlmJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1].trim() : trimmed
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return null
  }
}

function payloadFromLlm(kind: DocKind, data: Record<string, unknown>): ParsedDocPayload | null {
  const conf = (c: unknown): Confidence =>
    c === "high" || c === "medium" || c === "low" ? c : "medium"

  const f = <T>(key: string, fallbackConf: Confidence = "medium") => {
    const node = data[key]
    if (node && typeof node === "object" && node !== null && "value" in node) {
      const obj = node as { value: T; confidence?: Confidence }
      return field(obj.value, conf(obj.confidence ?? fallbackConf))
    }
    if (node != null && node !== "") return field(node as T, fallbackConf)
    return undefined
  }

  switch (kind) {
    case "customer":
      return {
        kind: "customer",
        data: {
          name: f<string>("name"),
          mcNumber: f<string>("mcNumber", "high"),
          dotNumber: f<string>("dotNumber", "high"),
          billingEmail: f<string>("billingEmail"),
          paymentTermsDays: f<number>("paymentTermsDays"),
          phone: f<string>("phone"),
          type: f<"broker" | "shipper">("type"),
        },
      }
    case "registration":
      return {
        kind: "registration",
        data: {
          unitNumber: f<string>("unitNumber"),
          vin: f<string>("vin", "high"),
          plate: f<string>("plate"),
          plateState: f<string>("plateState"),
          registrationExpiry: f<string>("registrationExpiry"),
          year: f<number>("year", "low"),
        },
      }
    case "cdl":
      return {
        kind: "cdl",
        data: {
          firstName: f<string>("firstName"),
          lastName: f<string>("lastName"),
          cdlNumber: f<string>("cdlNumber"),
          cdlState: f<string>("cdlState"),
          cdlExpiry: f<string>("cdlExpiry"),
        },
      }
    case "med_card":
      return {
        kind: "med_card",
        data: {
          firstName: f<string>("firstName"),
          lastName: f<string>("lastName"),
          medicalCardExpiry: f<string>("medicalCardExpiry"),
        },
      }
    case "w9":
      return {
        kind: "w9",
        data: {
          businessName: f<string>("businessName"),
          ein: f<string>("ein"),
          address: f<string>("address"),
        },
      }
    case "coi":
      return {
        kind: "coi",
        data: {
          insuredName: f<string>("insuredName"),
          policyNumber: f<string>("policyNumber"),
          expiry: f<string>("expiry"),
        },
      }
    case "spreadsheet":
      return {
        kind: "spreadsheet",
        data: {
          hint:
            data.hint === "loads" || data.hint === "fuel" || data.hint === "unknown"
              ? data.hint
              : "unknown",
        },
      }
    case "unknown":
      return { kind: "unknown", data: { preview: String(data.preview ?? "").slice(0, 500) } }
    default:
      return null
  }
}

export async function parseDocumentWithLlm(
  text: string,
  fileName?: string
): Promise<DocAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return null

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"
  const redacted = redactPiiForLlm(text).slice(0, 12000)

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `You extract structured fields from trucking carrier paperwork for a TMS.
Return ONLY valid JSON (no markdown) with this shape:
{
  "kind": one of ${DOC_KINDS.join("|")},
  "fields": { ... } // shape depends on kind; each field is { "value": ..., "confidence": "high"|"medium"|"low" }
}

Kinds:
- rate_con: brokerName, mcNumber, reference, linehaulDollars, equipment, commodity, stops[{type,city,state,date}]
- customer: name, mcNumber, dotNumber, billingEmail, paymentTermsDays, phone, type
- registration: unitNumber, vin, plate, plateState, registrationExpiry (YYYY-MM-DD), year
- cdl / med_card / w9 / coi: obvious field names
- spreadsheet: hint loads|fuel|unknown
- unknown: preview (first 200 chars)

Normalize dates to YYYY-MM-DD. File name hint: ${fileName ?? "none"}.

Document text:
${redacted}`,
        },
      ],
    }),
  })

  if (!response.ok) return null

  const body = (await response.json()) as {
    content?: { type: string; text?: string }[]
  }
  const block = body.content?.find((c) => c.type === "text")
  if (!block?.text) return null

  const parsed = parseLlmJson(block.text)
  if (!parsed) return null

  const kind = DOC_KINDS.includes(parsed.kind as DocKind) ? (parsed.kind as DocKind) : "unknown"
  const fields = (parsed.fields ?? parsed) as Record<string, unknown>

  if (kind === "rate_con") {
    const { parseRateCon } = await import("../parser")
    const heuristic = parseRateCon(text)
    return {
      kind: "rate_con",
      label: DOC_KIND_LABELS.rate_con,
      payload: { kind: "rate_con", data: heuristic },
      summary: [],
    }
  }

  const payload = payloadFromLlm(kind, fields)
  if (!payload) return null

  if (payload.kind === "registration" && payload.data.registrationExpiry?.value) {
    const normalized = normalizeDate(String(payload.data.registrationExpiry.value))
    if (normalized) payload.data.registrationExpiry = { value: normalized, confidence: "high" }
  }

  return {
    kind,
    label: DOC_KIND_LABELS[kind],
    payload,
    summary: [],
  }
}
