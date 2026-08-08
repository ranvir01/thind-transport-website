/**
 * DocumentParser — deterministic heuristic rate-confirmation parser.
 * Pure (no DB, no network) so it is unit-testable; the LLM-backed parser is a
 * Phase 6 drop-in behind the same output shape.
 */
import { dollarsToCents } from "./types"

export type Confidence = "high" | "medium" | "low"

export interface ParsedField<T> {
  value: T
  confidence: Confidence
}

export interface ParsedStop {
  type: "pickup" | "delivery"
  city: string
  state: string
  date?: string
  confidence: Confidence
}

export interface ParsedRateCon {
  brokerName?: ParsedField<string>
  mcNumber?: ParsedField<string>
  reference?: ParsedField<string>
  linehaulCents?: ParsedField<number>
  fuelSurchargeCents?: ParsedField<number>
  totalCents?: ParsedField<number>
  equipment?: ParsedField<"flatbed" | "reefer" | "dry_van">
  weightLbs?: ParsedField<number>
  commodity?: ParsedField<string>
  stops: ParsedStop[]
}

const MONEY = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/
const CITY_STATE = /([A-Za-z][A-Za-z .'-]{1,30}),\s*([A-Z]{2})\b(?:\s+(\d{5}))?/
const DATE_RE = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/

function moneyToCents(raw: string): number {
  return dollarsToCents(raw)
}

/** Strip connector words a loose city regex can swallow ("to Boise" → "Boise"). */
function cleanCity(raw: string): string {
  return raw.trim().replace(/^(?:to|from|via|at|in)\s+/i, "")
}

function findMoney(text: string, labels: RegExp): { cents: number; confidence: Confidence } | null {
  const lines = text.split("\n")
  for (const line of lines) {
    if (!labels.test(line)) continue
    const match = line.match(MONEY)
    if (match) return { cents: moneyToCents(match[1]), confidence: "high" }
  }
  return null
}

export function parseRateCon(text: string): ParsedRateCon {
  const result: ParsedRateCon = { stops: [] }
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // MC number → broker identity anchor
  const mcMatch = text.match(/MC\s*#?\s*:?\s*(\d{5,8})/i)
  if (mcMatch) result.mcNumber = { value: mcMatch[1], confidence: "high" }

  // Broker name: explicit label, else the line nearest the MC number, else first line
  const brokerLabel = text.match(/(?:Broker|Bill\s*To|From)\s*[:\-]\s*(.{3,60})/i)
  if (brokerLabel) {
    result.brokerName = { value: brokerLabel[1].trim().replace(/\s{2,}.*/, ""), confidence: "high" }
  } else if (mcMatch) {
    const mcLineIdx = lines.findIndex((l) => /MC\s*#?\s*:?\s*\d{5,8}/i.test(l))
    const nameLine = lines[mcLineIdx]?.replace(/MC\s*#?\s*:?\s*\d{5,8}.*/i, "").trim()
    const candidate = nameLine || lines[Math.max(0, mcLineIdx - 1)]
    if (candidate && candidate.length >= 3) {
      result.brokerName = { value: candidate, confidence: "medium" }
    }
  } else if (lines[0] && lines[0].length >= 3 && !MONEY.test(lines[0])) {
    result.brokerName = { value: lines[0], confidence: "low" }
  }

  // References: order/load/confirmation numbers (must contain a digit; same line only)
  const refMatch = text.match(/(?:Load|Order|Confirmation|Ref(?:erence)?|Pro)[ \t]*#?[ \t]*:?[ \t]*([A-Z0-9-]*\d[A-Z0-9-]*)/i)
  if (refMatch) result.reference = { value: refMatch[1], confidence: "high" }

  // Money: linehaul / FSC / total
  const linehaul = findMoney(text, /line\s*haul|flat\s*rate|base\s*rate|rate(?!\s*con)/i)
  if (linehaul) result.linehaulCents = { value: linehaul.cents, confidence: linehaul.confidence }
  const fsc = findMoney(text, /fuel|fsc/i)
  if (fsc) result.fuelSurchargeCents = { value: fsc.cents, confidence: fsc.confidence }
  const total = findMoney(text, /total|amount\s*due|agreed/i)
  if (total) result.totalCents = { value: total.cents, confidence: total.confidence }
  // If only a total exists, treat it as linehaul (dispatcher confirms anyway).
  if (!result.linehaulCents && result.totalCents) {
    result.linehaulCents = { value: result.totalCents.value, confidence: "medium" }
  }

  // Equipment
  const equipText = text.toLowerCase()
  if (/flat\s*bed|step\s*deck|conestoga/.test(equipText)) {
    result.equipment = { value: "flatbed", confidence: "high" }
  } else if (/reefer|refrigerat|temp\s*control/.test(equipText)) {
    result.equipment = { value: "reefer", confidence: "high" }
  } else if (/dry\s*van|\bvan\b|53'?\s*van/.test(equipText)) {
    result.equipment = { value: "dry_van", confidence: "high" }
  }

  // Weight
  const weightMatch = text.match(/([0-9]{1,3}(?:,[0-9]{3})*)\s*(?:lbs|pounds|#)/i)
  if (weightMatch) {
    result.weightLbs = { value: Number(weightMatch[1].replace(/,/g, "")), confidence: "high" }
  }

  // Commodity
  const commodityMatch = text.match(/Commodity\s*[:\-]\s*(.{2,40})/i)
  if (commodityMatch) result.commodity = { value: commodityMatch[1].trim(), confidence: "high" }

  // Stops: labeled pickup/delivery sections first, then any city,ST in order
  const stopLabels: { re: RegExp; type: "pickup" | "delivery" }[] = [
    { re: /(?:pick\s*up|shipper|origin|PU)\b/i, type: "pickup" },
    { re: /(?:deliver|consignee|destination|drop|receiver)\b/i, type: "delivery" },
  ]
  for (let i = 0; i < lines.length; i++) {
    for (const { re, type } of stopLabels) {
      if (!re.test(lines[i])) continue
      // Look on the same line and the next two for a city,ST
      for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
        const cs = lines[j].match(CITY_STATE)
        if (cs) {
          const city = cleanCity(cs[1])
          const date = (lines[j].match(DATE_RE) ?? lines[j + 1]?.match(DATE_RE))?.[1]
          if (!result.stops.some((s) => s.city === city && s.state === cs[2] && s.type === type)) {
            result.stops.push({ type, city, state: cs[2], date, confidence: "high" })
          }
          break
        }
      }
      break
    }
  }
  // Fallback: first two city,ST pairs in the document = pickup → delivery
  if (result.stops.length < 2) {
    const seen = new Set(result.stops.map((s) => `${s.city},${s.state}`))
    const cityMatches = [...text.matchAll(new RegExp(CITY_STATE.source, "g"))]
    for (const match of cityMatches) {
      const city = cleanCity(match[1])
      const key = `${city},${match[2]}`
      if (seen.has(key)) continue
      seen.add(key)
      result.stops.push({
        type: result.stops.length === 0 ? "pickup" : "delivery",
        city,
        state: match[2],
        confidence: "low",
      })
      if (result.stops.length >= 2) break
    }
  }

  return result
}
