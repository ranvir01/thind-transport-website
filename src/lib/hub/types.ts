/** Shared Hub types and domain constants. */

export const HUB_ROLES = ["owner", "dispatcher", "accountant", "driver", "broker", "shipper", "platform_admin"] as const
export type HubRole = (typeof HUB_ROLES)[number]

/** Roles assignable from the Users admin (platform_admin is reserved until Phase 7). */
export const ASSIGNABLE_ROLES = ["owner", "dispatcher", "accountant", "driver", "broker", "shipper"] as const

/** Roles allowed into the office side of the Hub (Phase 1). */
export const OFFICE_ROLES: HubRole[] = ["owner", "dispatcher", "accountant"]

export const LOAD_STATUSES = [
  "quoted",
  "booked",
  "dispatched",
  "at_pickup",
  "in_transit",
  "delivered",
  "pod_received",
  "invoiced",
  "paid",
  "settled",
  "cancelled",
] as const
export type LoadStatus = (typeof LOAD_STATUSES)[number]

/** Forward-only lifecycle. Cancel is allowed from any pre-delivery status. */
export const NEXT_STATUS: Partial<Record<LoadStatus, LoadStatus>> = {
  quoted: "booked",
  booked: "dispatched",
  dispatched: "at_pickup",
  at_pickup: "in_transit",
  in_transit: "delivered",
  delivered: "pod_received",
  pod_received: "invoiced",
  invoiced: "paid",
  paid: "settled",
}

export const STATUS_LABELS: Record<LoadStatus, string> = {
  quoted: "Quoted",
  booked: "Booked",
  dispatched: "Dispatched",
  at_pickup: "At Pickup",
  in_transit: "In Transit",
  delivered: "Delivered",
  pod_received: "POD Received",
  invoiced: "Invoiced",
  paid: "Paid",
  settled: "Settled",
  cancelled: "Cancelled",
}

/** Statuses shown as columns on the dispatch board (active operations). */
export const BOARD_STATUSES: LoadStatus[] = [
  "booked",
  "dispatched",
  "at_pickup",
  "in_transit",
  "delivered",
  "pod_received",
]

export const EQUIPMENT_TYPES = ["flatbed", "reefer", "dry_van"] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  flatbed: "Flatbed",
  reefer: "Reefer",
  dry_van: "Dry Van",
}

export const DOCUMENT_KINDS = [
  "rate_confirmation",
  "bol",
  "pod",
  "receipt",
  "cdl",
  "medical_card",
  "registration",
  "inspection",
  "insurance",
  "w9",
  "agreement",
  "other",
] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  rate_confirmation: "Rate Confirmation",
  bol: "BOL",
  pod: "POD",
  receipt: "Receipt",
  cdl: "CDL",
  medical_card: "Medical Card",
  registration: "Registration",
  inspection: "Inspection",
  insurance: "Insurance",
  w9: "W-9",
  agreement: "Agreement",
  other: "Other",
}

export interface HubUser {
  id: string
  email: string
  name: string
  role: HubRole
  carrier_id: string | null
  allowed_carrier_ids?: string[] | null
  data_mode?: "production" | "sandbox"
  phone: string | null
  customer_id: string | null
  driver_id: string | null
  active: boolean
}

export interface Truck {
  id: string
  unit_number: string
  vin: string | null
  plate: string | null
  plate_state: string | null
  year: number | null
  make: string | null
  model: string | null
  ownership: "company" | "owner_operator"
  status: "active" | "shop" | "idle" | "retired"
  registration_expiry: string | null
  inspection_due: string | null
  insurance_expiry: string | null
  assigned_driver_id: string | null
  tank_capacity_gallons: number | null
  driver_name?: string | null
  notes: string | null
}

export interface Trailer {
  id: string
  unit_number: string
  vin: string | null
  plate: string | null
  plate_state: string | null
  year: number | null
  make: string | null
  type: EquipmentType
  status: "active" | "shop" | "idle" | "retired"
  registration_expiry: string | null
  inspection_due: string | null
  notes: string | null
}

export interface Driver {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  cdl_number: string | null
  cdl_state: string | null
  cdl_expiry: string | null
  medical_card_expiry: string | null
  hire_date: string | null
  pay_type: "per_mile" | "percentage"
  pay_rate: string
  pay_loaded_miles_only: boolean
  escrow_weekly_cents: number
  insurance_weekly_cents: number
  status: "active" | "inactive" | "applicant"
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
}

export interface Customer {
  id: string
  name: string
  type: "broker" | "shipper"
  mc_number: string | null
  dot_number: string | null
  billing_email: string | null
  billing_address: string | null
  phone: string | null
  payment_terms_days: number
  credit_limit_cents: number | null
  factored: boolean
  status: "active" | "on_hold" | "blacklisted"
  notes: string | null
}

export interface Contact {
  id: string
  customer_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
}

export interface Stop {
  id: string
  load_id: string
  sequence: number
  type: "pickup" | "delivery"
  facility: string | null
  address: string | null
  city: string
  state: string
  zip: string | null
  fcfs: boolean
  pickup_number: string | null
  po_number: string | null
  appt_start: string | null
  appt_end: string | null
  arrived_at: string | null
  departed_at: string | null
  lat: number | null
  lng: number | null
  notes: string | null
}

export interface Accessorial {
  label: string
  amount_cents: number
}

export interface Load {
  id: string
  carrier_id: string
  reference: string
  customer_reference: string | null
  customer_id: string | null
  status: LoadStatus
  equipment: EquipmentType
  commodity: string | null
  weight_lbs: number | null
  linehaul_cents: number
  fuel_surcharge_cents: number
  accessorials: Accessorial[]
  loaded_miles: number | null
  deadhead_miles: number | null
  truck_id: string | null
  trailer_id: string | null
  driver_id: string | null
  dispatcher_id: string | null
  source: "dat" | "direct" | "import" | "quote"
  factored: boolean
  settlement_id: string | null
  notes: string | null
  created_at: string
  // joined fields
  customer_name?: string | null
  driver_name?: string | null
  truck_unit?: string | null
  trailer_unit?: string | null
  origin_city?: string | null
  origin_state?: string | null
  dest_city?: string | null
  dest_state?: string | null
  doc_kinds?: string[] | null
  invoice_id?: string | null
  invoice_status?: string | null
}

export interface HubDocument {
  id: string
  entity_type: "load" | "truck" | "trailer" | "driver" | "customer"
  entity_id: string
  kind: DocumentKind
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  storage: "local" | "blob"
  url: string
  expiry: string | null
  uploaded_by: string | null
  created_at: string
}

export const LOAD_EVENT_KINDS = [
  "status_change", "check_call", "geo", "document", "note",
  "weather_alert", "detention", "exception",
] as const
export type LoadEventKind = (typeof LOAD_EVENT_KINDS)[number]

export interface LoadEvent {
  id: number
  load_id: string
  kind: LoadEventKind
  actor_name: string | null
  payload: Record<string, unknown>
  created_at: string
}

/** Total load revenue in integer cents — the only way money is summed. */
export function loadTotalCents(
  load: Pick<Load, "linehaul_cents" | "fuel_surcharge_cents" | "accessorials">
): number {
  const accessorials = Array.isArray(load.accessorials) ? load.accessorials : []
  return (
    Number(load.linehaul_cents || 0) +
    Number(load.fuel_surcharge_cents || 0) +
    accessorials.reduce((sum, a) => sum + Number(a.amount_cents || 0), 0)
  )
}

export function fmtCents(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  })
}

export function fmtCentsExact(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  })
}

/** Parse a dollars string/number from a form into integer cents (no float drift). */
export function dollarsToCents(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.\-]/g, ""))
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

// ---- Money domain types (Phase 2) ----

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "disputed"

export interface Invoice {
  id: string
  carrier_id: string
  number: string
  customer_id: string
  load_id: string
  amount_cents: number
  issued_on: string
  due_on: string
  status: InvoiceStatus
  factored: boolean
  remit_to: string | null
  pdf_url: string | null
  sent_log: { to: string; at: string; kind: string }[]
  customer_name?: string
  load_reference?: string
  paid_cents?: number
}

export interface Settlement {
  id: string
  carrier_id: string
  driver_id: string
  period_start: string
  period_end: string
  status: "draft" | "approved" | "paid"
  gross_cents: number
  deductions_cents: number
  net_cents: number
  statement_url: string | null
  approved_at: string | null
  driver_name?: string
  pay_type?: "per_mile" | "percentage"
}

export interface SettlementLine {
  id: string
  settlement_id: string
  kind: "earning" | "reimbursement" | "deduction"
  label: string
  amount_cents: number
  source_type: string | null
  source_id: string | null
}

export const EXPENSE_CATEGORIES = [
  "fuel", "tolls", "maintenance", "insurance", "permits", "parking", "lumper", "other",
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string
  category: ExpenseCategory
  amount_cents: number
  incurred_on: string
  truck_id: string | null
  driver_id: string | null
  load_id: string | null
  reimbursable: boolean
  billable: boolean
  settled_line_id: string | null
  memo: string | null
  truck_unit?: string | null
  driver_name?: string | null
}

export interface Advance {
  id: string
  driver_id: string
  amount_cents: number
  issued_on: string
  reference: string | null
  status: "pending" | "outstanding" | "applied" | "cancelled"
  driver_name?: string
}

// ---- Fuel / compliance domain types (Phase 3) ----

export interface FuelTransaction {
  id: string
  source: string
  external_id: string
  card_program: string | null
  truck_id: string | null
  driver_id: string | null
  ts: string
  merchant: string | null
  city: string | null
  jurisdiction: string | null
  gallons: string
  fuel_type: string | null
  unit_price_cents: number | null
  total_cents: number
  odometer: string | null
  truck_unit?: string | null
  driver_name?: string | null
}

export interface IftaReportRow {
  jurisdiction: string
  miles: number
  taxableGallons: number
  taxPaidGallons: number
  rate: number
  surchargeRate: number
  taxCents: number
  surchargeCents: number
  netCents: number
}
