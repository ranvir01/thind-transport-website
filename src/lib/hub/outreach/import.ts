/**
 * Prospect import parsing — turns pasted CSV/TSV (from anywhere: a spreadsheet,
 * an FMCSA export, a VA's list) into normalized prospect rows. Pure and
 * testable; the DB layer handles dedupe/upsert.
 *
 * Tolerant by design: detects a header row if present and maps common column
 * names; falls back to positional (name, email, phone, company) when there's no
 * recognizable header. Accepts comma OR tab delimiters.
 */
import type { Audience, ProspectInput } from "./draft"

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  name: "contactName", "contact": "contactName", "contact name": "contactName", "full name": "contactName",
  company: "company", "company name": "company", carrier: "company", broker: "company", shipper: "company",
  email: "email", "email address": "email", "e-mail": "email",
  phone: "phone", "phone number": "phone", tel: "phone", mobile: "phone", cell: "phone",
  mc: "mcNumber", "mc number": "mcNumber", "mc#": "mcNumber", "mc_number": "mcNumber", docket: "mcNumber",
  lane: "lane", lanes: "lane", route: "lane",
  equipment: "equipment", equip: "equipment", trailer: "equipment",
  notes: "notes", note: "notes", comment: "notes", comments: "notes",
}

interface ParsedRow {
  contactName?: string
  company?: string
  email?: string
  phone?: string
  mcNumber?: string
  lane?: string
  equipment?: string
  notes?: string
}

/** Split one delimited line respecting double-quoted fields. */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } // escaped quote
        else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      out.push(cur); cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

/**
 * Parse pasted list text into prospect inputs for the given audience.
 * Returns rows with at least one of email/phone/company (drops empties).
 */
export function parseProspects(text: string, audience: Audience): ProspectInput[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const delim = lines[0].includes("\t") ? "\t" : ","
  const firstCells = splitLine(lines[0], delim).map((c) => c.toLowerCase())
  const headerHit = firstCells.some((c) => c in HEADER_ALIASES)

  let colMap: (keyof ParsedRow | null)[] | null = null
  let dataStart = 0
  if (headerHit) {
    colMap = firstCells.map((c) => HEADER_ALIASES[c] ?? null)
    dataStart = 1
  }

  const rows: ProspectInput[] = []
  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim)
    const r: ParsedRow = {}
    if (colMap) {
      colMap.forEach((key, idx) => {
        if (key && cells[idx]) r[key] = cells[idx]
      })
    } else {
      // No header: positional, but auto-detect an email in any column so a
      // "Name, Phone, Email" order still lands the email correctly.
      const emailCell = cells.find(looksLikeEmail)
      const rest = cells.filter((c) => c && c !== emailCell)
      r.email = emailCell
      r.contactName = rest[0]
      r.phone = rest.find((c) => /[0-9]/.test(c) && c !== rest[0])
      r.company = rest.find((c) => c !== r.contactName && c !== r.phone)
    }
    const email = r.email && looksLikeEmail(r.email) ? r.email.toLowerCase() : undefined
    const hasSignal = email || r.phone || r.company
    if (!hasSignal) continue
    rows.push({
      audience,
      company: r.company || null,
      contactName: r.contactName || null,
      email: email || null,
      phone: r.phone || null,
      mcNumber: r.mcNumber || null,
      lane: r.lane || null,
      equipment: r.equipment || null,
      notes: r.notes || null,
    })
  }
  return rows
}
