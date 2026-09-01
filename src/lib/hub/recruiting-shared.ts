/**
 * Recruiting constants/types shared by server libs and client components.
 * Plain module — NO database imports (client bundles include this file).
 */

export const APPLICANT_STAGES = [
  "applied", "screened", "mvr_psp", "road_test", "drug_test", "offer", "orientation", "active",
] as const
export type ApplicantStage = (typeof APPLICANT_STAGES)[number] | "rejected"

export const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screened: "Screened",
  mvr_psp: "MVR / PSP",
  road_test: "Road test",
  drug_test: "Drug test",
  offer: "Offer",
  orientation: "Orientation",
  active: "Hired",
  rejected: "Rejected",
}

/** The orientation checklist every applicant must clear before conversion. */
export const ORIENTATION_TEMPLATE = [
  { key: "policies", label: "Policies acknowledged (e-signed)", done: false },
  { key: "equipment", label: "Equipment issued (keys, cards, PPE)", done: false },
  { key: "eld", label: "ELD account created & login tested", done: false },
  { key: "fuel_card", label: "Fuel card assigned", done: false },
  { key: "emergency", label: "Emergency contacts on file", done: false },
]

export interface Applicant {
  id: string
  source: "public_site" | "manual" | "referral"
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  cdl_number: string | null
  cdl_state: string | null
  years_experience: string | null
  stage: ApplicantStage
  rejected_reason: string | null
  notes: string | null
  application: Record<string, unknown> | null
  converted_driver_id: string | null
  orientation: { key: string; label: string; done: boolean }[]
  created_at: string
  // joined
  referrer_name?: string | null
  offer_status?: string | null
}
