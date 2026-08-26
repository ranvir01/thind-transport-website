import type { DocKind } from "./types"

/** Score-based classifier — deterministic, no network, unit-testable. */
export function classifyDocument(text: string, fileName?: string): DocKind {
  const lower = text.toLowerCase()
  const name = (fileName ?? "").toLowerCase()

  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return "spreadsheet"
  }
  if (/^[^,\n]+,[^,\n]+(,[^,\n]+){2,}/m.test(text.slice(0, 2000)) && text.split("\n").length >= 3) {
    return "spreadsheet"
  }

  const scores: Record<Exclude<DocKind, "unknown">, number> = {
    rate_con: 0,
    customer: 0,
    registration: 0,
    cdl: 0,
    med_card: 0,
    w9: 0,
    coi: 0,
    spreadsheet: 0,
  }

  if (/rate\s*confirm|line\s*haul|linehaul|pick\s*up|delivery|fuel\s*surcharge|\bfsc\b/i.test(text)) {
    scores.rate_con += 3
  }
  if (/form\s*w-?9|request for taxpayer|employer identification number/i.test(text)) {
    scores.w9 += 5
  }
  if (/certificate of insurance|certificat(e)? of liability|general liability|cargo/i.test(text)) {
    scores.coi += 4
  }
  if (/commercial driver|driver.?s license|\bcdl\b|class [abc]\b/i.test(text)) {
    scores.cdl += 4
  }
  if (/medical examiner|medical certificate|dot physical|med card/i.test(text)) {
    scores.med_card += 5
  }
  if (/vehicle registration|registration certificate|license plate|plate number|\bvin\b/i.test(text)) {
    scores.registration += 3
  }
  if (/expir(es|ation|y)/i.test(text) && /registration|plate|vehicle/i.test(text)) {
    scores.registration += 2
  }
  if (/mc\s*#?\s*\d{5,8}|docket\s*number|broker authority|freight broker/i.test(text)) {
    scores.customer += 3
  }
  if (/bill\s*to|billing email|net\s*\d+/i.test(text) && /mc\s*#?\s*\d/i.test(text)) {
    scores.customer += 2
  }

  let best: DocKind = "unknown"
  let bestScore = 1
  for (const [kind, score] of Object.entries(scores) as [Exclude<DocKind, "unknown">, number][]) {
    if (score > bestScore) {
      bestScore = score
      best = kind
    }
  }

  // Rate cons often mention MC — prefer rate_con when both signals fire.
  if (scores.rate_con >= 3 && scores.rate_con >= scores.customer) return "rate_con"

  return bestScore >= 2 ? best : "unknown"
}
