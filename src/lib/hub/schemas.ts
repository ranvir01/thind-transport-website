import { z } from "zod"
import { DOCUMENT_KINDS, EQUIPMENT_TYPES, HUB_ROLES } from "./types"

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD")
  .nullable()
  .optional()

const optionalInt = z.coerce
  .number()
  .int()
  .nonnegative()
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null))

export const truckSchema = z.object({
  unit_number: z.string().trim().min(1, "Unit number is required"),
  vin: optionalString,
  plate: optionalString,
  plate_state: optionalString,
  year: optionalInt,
  make: optionalString,
  model: optionalString,
  ownership: z.enum(["company", "owner_operator"]),
  status: z.enum(["active", "shop", "idle", "retired"]),
  registration_expiry: optionalDate,
  inspection_due: optionalDate,
  insurance_expiry: optionalDate,
  assigned_driver_id: optionalString,
  tank_capacity_gallons: optionalInt,
  notes: optionalString,
})

export const trailerSchema = z.object({
  unit_number: z.string().trim().min(1, "Unit number is required"),
  vin: optionalString,
  plate: optionalString,
  plate_state: optionalString,
  year: optionalInt,
  make: optionalString,
  type: z.enum(EQUIPMENT_TYPES),
  status: z.enum(["active", "shop", "idle", "retired"]),
  registration_expiry: optionalDate,
  inspection_due: optionalDate,
  notes: optionalString,
})

export const driverSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  phone: optionalString,
  email: optionalString,
  cdl_number: optionalString,
  cdl_state: optionalString,
  cdl_expiry: optionalDate,
  medical_card_expiry: optionalDate,
  hire_date: optionalDate,
  pay_type: z.enum(["per_mile", "percentage"]),
  pay_rate: z.coerce.number().nonnegative("Pay rate must be 0 or more"),
  pay_loaded_miles_only: z.coerce.boolean().default(true),
  escrow_weekly: z.coerce.number().nonnegative().default(0),
  insurance_weekly: z.coerce.number().nonnegative().default(0),
  status: z.enum(["active", "inactive", "applicant"]),
  emergency_contact_name: optionalString,
  emergency_contact_phone: optionalString,
  notes: optionalString,
})

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["broker", "shipper"]),
  mc_number: optionalString,
  dot_number: optionalString,
  billing_email: optionalString,
  billing_address: optionalString,
  phone: optionalString,
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  credit_limit: z.coerce.number().nonnegative().nullable().optional().or(z.literal("").transform(() => null)),
  factored: z.coerce.boolean().default(false),
  status: z.enum(["active", "on_hold", "blacklisted"]),
  notes: optionalString,
})

export const contactSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  role: optionalString,
  phone: optionalString,
  email: optionalString,
})

export const stopSchema = z.object({
  type: z.enum(["pickup", "delivery"]),
  facility: optionalString,
  address: optionalString,
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(2, "State is required").max(2, "Use 2-letter state code"),
  zip: optionalString,
  fcfs: z.coerce.boolean().default(false),
  pickup_number: optionalString,
  po_number: optionalString,
  appt_start: optionalString,
  appt_end: optionalString,
  notes: optionalString,
})

export const loadSchema = z.object({
  customer_id: z.string().uuid("Pick a customer"),
  customer_reference: optionalString,
  equipment: z.enum(EQUIPMENT_TYPES),
  commodity: optionalString,
  weight_lbs: optionalInt,
  // Dollars from the form; actions convert to integer cents.
  linehaul: z.coerce.number().nonnegative("Linehaul must be 0 or more"),
  fuel_surcharge: z.coerce.number().nonnegative().default(0),
  accessorials: z
    .array(z.object({ label: z.string().trim().min(1), amount: z.coerce.number() }))
    .default([]),
  loaded_miles: optionalInt,
  deadhead_miles: optionalInt,
  truck_id: optionalString,
  trailer_id: optionalString,
  driver_id: optionalString,
  factored: z.coerce.boolean().default(false),
  notes: optionalString,
  stops: z.array(stopSchema).min(2, "A load needs at least a pickup and a delivery"),
})

export const documentUploadSchema = z.object({
  entity_type: z.enum(["load", "truck", "trailer", "driver", "customer", "incident", "facility", "applicant", "message"]),
  entity_id: z.string().uuid(),
  kind: z.enum(DOCUMENT_KINDS),
  expiry: optionalDate,
})

export const hubUserSchema = z.object({
  email: z.string().trim().email("Valid email required"),
  name: z.string().trim().min(1, "Name is required"),
  role: z.enum(HUB_ROLES),
  phone: optionalString,
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type TruckFormValues = z.input<typeof truckSchema>
export type TrailerFormValues = z.input<typeof trailerSchema>
export type DriverFormValues = z.input<typeof driverSchema>
export type CustomerFormValues = z.input<typeof customerSchema>
export type LoadFormValues = z.input<typeof loadSchema>
