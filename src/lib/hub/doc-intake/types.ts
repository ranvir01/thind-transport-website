import type { ParsedField, ParsedRateCon } from "../parser"

/** Document types Smart Setup recognizes and can apply to the database. */
export type DocKind =
  | "rate_con"
  | "customer"
  | "registration"
  | "cdl"
  | "med_card"
  | "w9"
  | "coi"
  | "spreadsheet"
  | "unknown"

export interface ParsedCustomer {
  name?: ParsedField<string>
  mcNumber?: ParsedField<string>
  dotNumber?: ParsedField<string>
  billingEmail?: ParsedField<string>
  paymentTermsDays?: ParsedField<number>
  phone?: ParsedField<string>
  type?: ParsedField<"broker" | "shipper">
}

export interface ParsedRegistration {
  unitNumber?: ParsedField<string>
  vin?: ParsedField<string>
  plate?: ParsedField<string>
  plateState?: ParsedField<string>
  registrationExpiry?: ParsedField<string>
  year?: ParsedField<number>
}

export interface ParsedCdl {
  firstName?: ParsedField<string>
  lastName?: ParsedField<string>
  cdlNumber?: ParsedField<string>
  cdlState?: ParsedField<string>
  cdlExpiry?: ParsedField<string>
}

export interface ParsedMedCard {
  firstName?: ParsedField<string>
  lastName?: ParsedField<string>
  medicalCardExpiry?: ParsedField<string>
}

export interface ParsedW9 {
  businessName?: ParsedField<string>
  ein?: ParsedField<string>
  address?: ParsedField<string>
}

export interface ParsedCoi {
  insuredName?: ParsedField<string>
  policyNumber?: ParsedField<string>
  expiry?: ParsedField<string>
}

export type ParsedDocPayload =
  | { kind: "rate_con"; data: ParsedRateCon }
  | { kind: "customer"; data: ParsedCustomer }
  | { kind: "registration"; data: ParsedRegistration }
  | { kind: "cdl"; data: ParsedCdl }
  | { kind: "med_card"; data: ParsedMedCard }
  | { kind: "w9"; data: ParsedW9 }
  | { kind: "coi"; data: ParsedCoi }
  | { kind: "spreadsheet"; data: { hint: "loads" | "fuel" | "unknown" } }
  | { kind: "unknown"; data: { preview: string } }

export interface DocAnalysis {
  kind: DocKind
  label: string
  payload: ParsedDocPayload
  /** Plain-language summary chips for the review card. */
  summary: string[]
}

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  rate_con: "Rate confirmation",
  customer: "Broker / shipper",
  registration: "Truck registration",
  cdl: "CDL",
  med_card: "Medical card",
  w9: "W-9",
  coi: "Certificate of insurance",
  spreadsheet: "Spreadsheet import",
  unknown: "Unrecognized",
}
