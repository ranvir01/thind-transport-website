/** Minimal RFC-4180 CSV parser — quoted fields, escaped quotes, CR/LF. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== "") rows.push(row)
  }
  return rows
}

/** The load fields a CSV column can map to. */
export const IMPORT_FIELDS = [
  { key: "customer_name", label: "Customer / Broker name", required: true },
  { key: "customer_reference", label: "Broker load # / reference", required: false },
  { key: "origin_city", label: "Origin city", required: true },
  { key: "origin_state", label: "Origin state", required: true },
  { key: "dest_city", label: "Destination city", required: true },
  { key: "dest_state", label: "Destination state", required: true },
  { key: "pickup_date", label: "Pickup date", required: false },
  { key: "delivery_date", label: "Delivery date", required: false },
  { key: "equipment", label: "Equipment (flatbed/reefer/dry van)", required: false },
  { key: "commodity", label: "Commodity", required: false },
  { key: "weight_lbs", label: "Weight (lbs)", required: false },
  { key: "linehaul", label: "Rate / linehaul ($)", required: true },
  { key: "fuel_surcharge", label: "Fuel surcharge ($)", required: false },
  { key: "loaded_miles", label: "Loaded miles", required: false },
  { key: "driver_name", label: "Driver name", required: false },
  { key: "truck_unit", label: "Truck unit #", required: false },
  { key: "notes", label: "Notes", required: false },
] as const

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"]

export interface ImportRow {
  customer_name: string
  customer_reference?: string
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  pickup_date?: string
  delivery_date?: string
  equipment?: string
  commodity?: string
  weight_lbs?: string
  linehaul: string
  fuel_surcharge?: string
  loaded_miles?: string
  driver_name?: string
  truck_unit?: string
  notes?: string
}

const MONEY_RE = /[^0-9.\-]/g

export function parseMoney(value: string | undefined): number {
  if (!value) return 0
  const num = Number(value.replace(MONEY_RE, ""))
  return Number.isFinite(num) ? num : 0
}

export function parseIntSafe(value: string | undefined): number | null {
  if (!value) return null
  const num = Math.round(Number(value.replace(MONEY_RE, "")))
  return Number.isFinite(num) && num > 0 ? num : null
}

export function normalizeEquipment(value: string | undefined): "flatbed" | "reefer" | "dry_van" {
  const v = (value ?? "").toLowerCase()
  if (v.includes("flat")) return "flatbed"
  if (v.includes("reef") || v.includes("refrig")) return "reefer"
  return "dry_van"
}

export function normalizeState(value: string): string {
  return value.trim().toUpperCase().slice(0, 2)
}

/** Tolerant date parsing for spreadsheet exports (MM/DD/YYYY, YYYY-MM-DD, etc). */
export function parseDateSafe(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = new Date(value.trim())
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}
