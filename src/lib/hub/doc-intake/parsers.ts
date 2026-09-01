/**
 * Deterministic document parsers for Smart Setup — same philosophy as parseRateCon:
 * pure heuristics, confidence-coded fields, LLM/OCR drop-in later behind the same shapes.
 */
import type { ParsedField } from "../parser"
import type {
  ParsedCdl,
  ParsedCoi,
  ParsedCustomer,
  ParsedMedCard,
  ParsedRegistration,
  ParsedW9,
} from "./types"

const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/i
const MC_RE = /MC\s*#?\s*:?\s*(\d{5,8})/i
const DOT_RE = /(?:US\s*DOT|DOT\s*#?\s*:?\s*|DOT\s+Number\s*:?\s*)(\d{5,10})/i
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const DATE_RE = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/

function field<T>(value: T, confidence: ParsedField<T>["confidence"]): ParsedField<T> {
  return { value, confidence }
}

/** Normalize common US date strings to YYYY-MM-DD for DB storage. */
export function normalizeDate(raw: string): string | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return raw

  const slash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (!slash) return null
  let [, m, d, y] = slash
  let year = Number(y)
  if (year < 100) year += year >= 70 ? 1900 : 2000
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

function firstDate(text: string, context: RegExp): ParsedField<string> | undefined {
  const lines = text.split("\n")
  for (const line of lines) {
    if (!context.test(line)) continue
    const match = line.match(DATE_RE)
    if (match) {
      const normalized = normalizeDate(match[1])
      if (normalized) return field(normalized, "high")
    }
  }
  const match = text.match(DATE_RE)
  if (match) {
    const normalized = normalizeDate(match[1])
    if (normalized) return field(normalized, "medium")
  }
  return undefined
}

export function parseCustomerDoc(text: string): ParsedCustomer {
  const result: ParsedCustomer = {}

  const mc = text.match(MC_RE)
  if (mc) result.mcNumber = field(mc[1], "high")

  const dot = text.match(DOT_RE)
  if (dot) result.dotNumber = field(dot[1], "high")

  const email = text.match(/(?:billing|invoice|remit|pay)\s*(?:email|to)?\s*[:\-]?\s*([^\s,]+@[^\s,]+)/i)
    ?? text.match(EMAIL_RE)
  if (email) {
    const addr = (email[1] ?? email[0]).trim()
    result.billingEmail = field(addr, email[1] ? "high" : "medium")
  }

  const terms = text.match(/net\s*(\d{1,3})/i)
  if (terms) result.paymentTermsDays = field(Number(terms[1]), "high")

  const brokerLabel = text.match(/(?:broker|company|carrier|bill\s*to)\s*[:\-]\s*(.{3,80})/i)
  if (brokerLabel) {
    result.name = field(brokerLabel[1].trim().replace(/\s{2,}.*/, ""), "high")
  } else if (mc) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
    const mcLine = lines.findIndex((l) => MC_RE.test(l))
    const candidate = lines[Math.max(0, mcLine - 1)] ?? lines[0]
    if (candidate && !MC_RE.test(candidate) && candidate.length >= 3) {
      result.name = field(candidate.replace(MC_RE, "").trim(), "medium")
    }
  }

  const phone = text.match(/(?:phone|tel)\s*[:\-]?\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i)
  if (phone) result.phone = field(phone[1], "medium")

  result.type = field(/shipper|consignee|receiver/i.test(text) && !/broker/i.test(text) ? "shipper" : "broker", "medium")

  return result
}

export function parseRegistration(text: string): ParsedRegistration {
  const result: ParsedRegistration = {}

  const vin = text.match(VIN_RE)
  if (vin) result.vin = field(vin[1].toUpperCase(), "high")

  const unit =
    text.match(/(?:unit|truck|fleet|vehicle)\s*#?\s*:?\s*([A-Za-z0-9-]{1,12})/i)
    ?? text.match(/\bUnit\s+([A-Za-z0-9-]{1,12})\b/i)
  if (unit) result.unitNumber = field(unit[1].toUpperCase(), "high")

  const plate = text.match(/(?:plate|lic(?:ense)?)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9-]{3,10})/i)
  if (plate) result.plate = field(plate[1].toUpperCase(), "high")

  const state = text.match(/(?:state|st)\s*[:\-]?\s*([A-Z]{2})\b/)
    ?? text.match(/\b([A-Z]{2})\s+\d{5}\b/)
  if (state) result.plateState = field(state[1], "medium")

  result.registrationExpiry = firstDate(text, /expir|registration|renew/i)

  const year = text.match(/\b(19|20)\d{2}\b/)
  if (year) result.year = field(Number(year[0]), "low")

  return result
}

export function parseCdl(text: string): ParsedCdl {
  const result: ParsedCdl = {}

  const commaName = text.match(/^([A-Z][A-Za-z' -]+),\s*([A-Z][A-Za-z' -]+)/m)
  if (commaName) {
    result.lastName = field(commaName[1].trim(), "high")
    result.firstName = field(commaName[2].trim(), "high")
  } else {
    const nameLabel = text.match(/(?:name|driver)\s*[:\-]\s*([A-Za-z' -]{3,60})/i)
    if (nameLabel) {
      const parts = nameLabel[1].trim().split(/\s+/)
      if (parts.length >= 2) {
        result.firstName = field(parts[0], "medium")
        result.lastName = field(parts.slice(1).join(" "), "medium")
      }
    }
  }

  const cdlNum = text.match(/(?:cdl|license)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9-]{5,20})/i)
  if (cdlNum) result.cdlNumber = field(cdlNum[1], "high")

  const cdlState = text.match(/(?:state|st)\s*[:\-]?\s*([A-Z]{2})\b.*(?:cdl|license)/i)
    ?? text.match(/(?:cdl|license).*(?:state|st)\s*[:\-]?\s*([A-Z]{2})\b/i)
  if (cdlState) result.cdlState = field(cdlState[1], "high")

  result.cdlExpiry = firstDate(text, /expir|valid|cdl|license/i)

  return result
}

export function parseMedCard(text: string): ParsedMedCard {
  const result: ParsedMedCard = {}

  const commaName = text.match(/^([A-Z][A-Za-z' -]+),\s*([A-Z][A-Za-z' -]+)/m)
  if (commaName) {
    result.lastName = field(commaName[1].trim(), "high")
    result.firstName = field(commaName[2].trim(), "high")
  }

  result.medicalCardExpiry = firstDate(text, /expir|valid|medical|card|examiner/i)

  return result
}

export function parseW9(text: string): ParsedW9 {
  const result: ParsedW9 = {}

  const ein = text.match(/(?:ein|employer id)\s*[:\-]?\s*(\d{2}-?\d{7})/i)
  if (ein) result.ein = field(ein[1].replace(/(\d{2})(\d{7})/, "$1-$2"), "high")

  const name = text.match(/(?:name|business name|company)\s*[:\-]\s*(.{3,80})/i)
  if (name) result.businessName = field(name[1].trim(), "high")

  const address = text.match(/(?:address|street)\s*[:\-]\s*(.{5,100})/i)
  if (address) result.address = field(address[1].trim(), "medium")

  return result
}

export function parseCoi(text: string): ParsedCoi {
  const result: ParsedCoi = {}

  const insured = text.match(/(?:insured|named insured|certificate holder)\s*[:\-]\s*(.{3,80})/i)
  if (insured) result.insuredName = field(insured[1].trim(), "medium")

  const policy = text.match(/(?:policy|certificate)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9-]{4,30})/i)
  if (policy) result.policyNumber = field(policy[1], "high")

  result.expiry = firstDate(text, /expir|effective|policy/i)

  return result
}

/** Guess spreadsheet import target from header row. */
export function classifySpreadsheet(text: string): "loads" | "fuel" | "unknown" {
  const header = text.split("\n")[0]?.toLowerCase() ?? ""
  if (/gallon|fuel|merchant|card|jurisdiction/.test(header)) return "fuel"
  if (/load|broker|linehaul|pickup|delivery|rate|driver|truck/.test(header)) return "loads"
  return "unknown"
}
