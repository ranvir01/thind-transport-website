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

/** Placeholders written by redactPiiForLlm — never data, see below. */
const REDACTION_MARKER = /\[[A-Z\s]*REDACTED[A-Z\s]*\]/

function field<T>(value: T | null | undefined, confidence: Confidence) {
  if (value == null || value === "") return undefined
  // The model only ever sees redacted text, so it can echo a placeholder back
  // as a "value" (W-9 address, CDL number). Dropping it here keeps the
  // placeholder out of the merge, so the heuristic pass — which reads the
  // original, un-redacted text — supplies the field instead.
  if (typeof value === "string" && REDACTION_MARKER.test(value)) return undefined
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

  // Pinned snapshot id, verified 2026-07-25 against the Anthropic model docs
  // (platform.claude.com/docs/en/about-claude/models/overview). The previous
  // default, claude-sonnet-4-20250514, was RETIRED 2026-06-15 — every call
  // 404'd and silently fell back to heuristics. claude-sonnet-4-6 is the
  // docs' named replacement; sonnet-5 is the current-generation Sonnet and is
  // cheaper until 2026-09-01, same price after.
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5"
  // PII leaves nothing but the redacted copy: this runs BEFORE the fetch below
  // and `redacted` is the only document text put in the request body.
  const redacted = redactPiiForLlm(text).slice(0, 12000)

  let response: Response
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
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
  } catch (err) {
    // Same silence, different cause: a DNS/TLS/timeout failure would otherwise
    // bubble into analyze-enhanced's bare catch and leave no trace at all.
    // Error name/message only — never the request body, never the API key.
    console.error(
      `[doc-intake] Anthropic Messages API unreachable for model "${model}": ` +
        `${err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"} — ` +
        `falling back to heuristic parsing`
    )
    return null
  }

  if (!response.ok) {
    // Observable, or a retired model / revoked key stays invisible forever:
    // callers just see the heuristic fallback. Status + reason phrase + model
    // id only — never the response body (it can quote the document) and never
    // the API key.
    console.error(
      `[doc-intake] Anthropic Messages API ${response.status}` +
        `${response.statusText ? ` ${response.statusText}` : ""} for model "${model}" — ` +
        `falling back to heuristic parsing`
    )
    return null
  }

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
