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

export interface ImportFieldDef {
  key: string
  label: string
  required: boolean
  /** Mapping this column waives these required fields (e.g. a combined name column). */
  coversRequired?: readonly string[]
}

/** Field configs per import kind — the universal importer is source-agnostic. */
export const FUEL_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "external_id", label: "Transaction ID", required: false },
  { key: "ts", label: "Date/time", required: true },
  { key: "truck_unit", label: "Truck unit #", required: false },
  { key: "driver_name", label: "Driver name", required: false },
  { key: "merchant", label: "Merchant / location", required: false },
  { key: "city", label: "City", required: false },
  { key: "jurisdiction", label: "State (2-letter)", required: true },
  { key: "gallons", label: "Gallons", required: true },
  { key: "fuel_type", label: "Fuel type", required: false },
  { key: "unit_price", label: "Price per gallon ($)", required: false },
  { key: "total", label: "Total ($)", required: true },
  { key: "odometer", label: "Odometer", required: false },
  { key: "card_program", label: "Card program", required: false },
] as const

export const TOLL_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "external_id", label: "Transaction ID", required: false },
  { key: "ts", label: "Date/time", required: true },
  { key: "truck_unit", label: "Truck unit #", required: false },
  { key: "transponder", label: "Transponder", required: false },
  { key: "plaza", label: "Plaza / road", required: false },
  { key: "jurisdiction", label: "State (2-letter)", required: false },
  { key: "total", label: "Amount ($)", required: true },
] as const

export const POSITION_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "truck_unit", label: "Truck unit #", required: true },
  { key: "ts", label: "Date/time", required: true },
  { key: "lat", label: "Latitude", required: true },
  { key: "lng", label: "Longitude", required: true },
  { key: "odometer", label: "ECM odometer", required: false },
] as const

/** TruckX-style IFTA mileage export: per truck per jurisdiction per quarter. */
export const MILEAGE_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "truck_unit", label: "Truck unit #", required: true },
  { key: "quarter", label: "Quarter (2026Q2)", required: true },
  { key: "jurisdiction", label: "State (2-letter)", required: true },
  { key: "miles", label: "Miles", required: true },
] as const

/** Setup-entity imports (M11 onboarding): fleet list, driver roster, broker list. */
export const TRUCK_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "unit_number", label: "Unit #", required: true },
  { key: "vin", label: "VIN", required: false },
  { key: "plate", label: "Plate", required: false },
  { key: "plate_state", label: "Plate state", required: false },
  { key: "year", label: "Year", required: false },
  { key: "make", label: "Make", required: false },
  { key: "model", label: "Model", required: false },
  { key: "ownership", label: "Ownership (company / owner-op)", required: false },
] as const

export const DRIVER_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "full_name", label: "Driver name (single column)", required: false, coversRequired: ["first_name", "last_name"] },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "cdl_number", label: "CDL number", required: false },
  { key: "cdl_state", label: "CDL state", required: false },
  { key: "cdl_expiry", label: "CDL expiry", required: false },
  { key: "medical_card_expiry", label: "Med card expiry", required: false },
  { key: "hire_date", label: "Hire date", required: false },
] as const

export const CUSTOMER_IMPORT_FIELDS: readonly ImportFieldDef[] = [
  { key: "name", label: "Broker / customer name", required: true },
  { key: "customer_type", label: "Type (broker/shipper)", required: false },
  { key: "mc_number", label: "MC number", required: false },
  { key: "dot_number", label: "DOT number", required: false },
  { key: "billing_email", label: "Billing email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "payment_terms_days", label: "Terms (days)", required: false },
] as const

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

/**
 * Split a combined "Driver Name" column into first/last. Handles
 * "Last, First [Middle]" and "First [Middle] Last"; returns null when the
 * value can't yield both parts (empty, single word, dangling comma).
 */
export function splitFullName(value: string | undefined): { first: string; last: string } | null {
  const raw = value?.trim().replace(/\s+/g, " ")
  if (!raw) return null
  const comma = raw.indexOf(",")
  if (comma >= 0) {
    const last = raw.slice(0, comma).trim()
    const first = raw.slice(comma + 1).trim().replace(/,/g, " ").replace(/\s+/g, " ")
    return first && last ? { first, last } : null
  }
  const parts = raw.split(" ")
  if (parts.length < 2) return null
  return { first: parts[0], last: parts.slice(1).join(" ") }
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

/**
 * Every 2-letter jurisdiction code a US/Canada carrier can legitimately file
 * or fuel in: 50 states + DC, and all 13 Canadian provinces/territories.
 * A 2-char input is only trusted when it is on this list — "XX" is a typo,
 * not a jurisdiction.
 */
const JURISDICTION_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
])

/**
 * Full names and the traditional (AP-style) abbreviations that show up in
 * fleet spreadsheets and fuel-card exports, keyed by the normalized form
 * (upper case, punctuation stripped, single-spaced).
 *
 * This map exists because truncating to the first two characters silently
 * files miles under the WRONG state — Minnesota and Missouri and Mississippi
 * all became "MI" (Michigan), Nevada became "NE" (Nebraska), Alaska became
 * "AL" (Alabama). Wrong-but-valid codes hand the fuel-tax credit to a state
 * the truck never entered.
 */
const JURISDICTION_BY_NAME: Record<string, string> = {
  ALABAMA: "AL", ALA: "AL",
  ALASKA: "AK", ALAS: "AK",
  ARIZONA: "AZ", ARIZ: "AZ",
  ARKANSAS: "AR", ARK: "AR",
  CALIFORNIA: "CA", CALIF: "CA", CAL: "CA",
  COLORADO: "CO", COLO: "CO",
  CONNECTICUT: "CT", CONN: "CT",
  DELAWARE: "DE", DEL: "DE",
  "DISTRICT OF COLUMBIA": "DC", "WASHINGTON DC": "DC",
  FLORIDA: "FL", FLA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI", HAW: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL", ILL: "IL",
  INDIANA: "IN", IND: "IN",
  IOWA: "IA",
  KANSAS: "KS", KAN: "KS", KANS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA", MASS: "MA",
  MICHIGAN: "MI", MICH: "MI",
  MINNESOTA: "MN", MINN: "MN",
  MISSISSIPPI: "MS", MISS: "MS",
  MISSOURI: "MO",
  MONTANA: "MT", MONT: "MT",
  NEBRASKA: "NE", NEB: "NE", NEBR: "NE",
  NEVADA: "NV", NEV: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "N MEX": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK", OKLA: "OK",
  OREGON: "OR", ORE: "OR", OREG: "OR",
  PENNSYLVANIA: "PA", PENN: "PA", PENNA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN", TENN: "TN",
  TEXAS: "TX", TEX: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA", WASH: "WA", "WASHINGTON STATE": "WA",
  "WEST VIRGINIA": "WV", WVA: "WV", "W VA": "WV",
  WISCONSIN: "WI", WIS: "WI", WISC: "WI",
  WYOMING: "WY", WYO: "WY",
  ALBERTA: "AB",
  "BRITISH COLUMBIA": "BC",
  MANITOBA: "MB",
  "NEW BRUNSWICK": "NB",
  NEWFOUNDLAND: "NL", "NEWFOUNDLAND AND LABRADOR": "NL",
  "NOVA SCOTIA": "NS",
  "NORTHWEST TERRITORIES": "NT",
  NUNAVUT: "NU",
  ONTARIO: "ON",
  "PRINCE EDWARD ISLAND": "PE", PEI: "PE",
  QUEBEC: "QC", PQ: "QC",
  SASKATCHEWAN: "SK", SASK: "SK",
  YUKON: "YT", "YUKON TERRITORY": "YT",
}

/**
 * A US state / Canadian province name or code → its IFTA jurisdiction code,
 * or null when the value is not a jurisdiction we recognize.
 *
 * Null (never a guess) is the whole point: callers that can store a blank
 * jurisdiction do so and surface it later (fuel with no state is already
 * reported as unknownJurisdictionGallons on the IFTA worksheet); callers that
 * cannot — the IFTA mileage import — reject the row instead of filing miles
 * under a state the truck never entered.
 */
export function normalizeState(value: string): string | null {
  // Dots vanish ("D.C." → "DC", "N.H." → "NH"); commas become spaces so
  // "Washington, D.C." collapses onto the same key as "Washington DC".
  const raw = value
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!raw) return null
  if (raw.length === 2 && JURISDICTION_CODES.has(raw)) return raw
  return JURISDICTION_BY_NAME[raw] ?? null
}

/** Tolerant date parsing for spreadsheet exports (MM/DD/YYYY, YYYY-MM-DD, etc). */
export function parseDateSafe(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = new Date(value.trim())
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}
