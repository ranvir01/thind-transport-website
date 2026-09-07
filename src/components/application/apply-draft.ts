/**
 * Session-scoped handoff from /pre-qualify → /apply.
 *
 * A driver who just spent ~60s on pre-qualify used to land on a blank
 * apply wizard and re-type phone, name, and email. That's the cheapest
 * abandonment we can remove: same-tab sessionStorage, no cookie, no extra
 * PII beyond what they already typed on this visit.
 *
 * URL `?type=` / `?lane=` still wins over the draft for seat and lane,
 * because a tap from /jobs/local is a more specific intent than the
 * sleeper-truck answer on the previous form.
 *
 * Client-safe: no next/headers.
 */
import {
  applyPrefFromSearch,
  type ApplyDriverType,
  type ApplyRouteType,
} from "./apply-progress"

export const APPLY_DRAFT_KEY = "tt_apply_draft"

/** Must match the radio values on ApplicationForm step 2. */
export const APPLY_EXPERIENCE_BUCKETS = ["1", "2", "3-5", "6-10", "10+"] as const
export type ApplyExperienceBucket = (typeof APPLY_EXPERIENCE_BUCKETS)[number]

export const APPLY_CDL_CLASSES = ["Class A", "Class B", "Class C"] as const
export type ApplyCdlClass = (typeof APPLY_CDL_CLASSES)[number]

export const APPLY_AVAILABILITY = [
  "immediate",
  "1week",
  "2weeks",
  "1month",
] as const
export type ApplyAvailability = (typeof APPLY_AVAILABILITY)[number]

export type ApplyWizardStep = 1 | 2 | 3 | 4

export type ApplyDraft = {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  businessAddress?: string
  driverType?: ApplyDriverType
  routeType?: ApplyRouteType
  experienceYears?: ApplyExperienceBucket
  accidents?: string
  violations?: string
  cdlClass?: ApplyCdlClass
  cdlNumber?: string
  availability?: ApplyAvailability
  previousEmployer?: string
  comments?: string
  /** Wizard step 1–4. Success (5) is never persisted. */
  step?: ApplyWizardStep
}

/** Form fields the wizard round-trips through sessionStorage (not files). */
export const APPLY_FORM_KEYS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "businessAddress",
  "driverType",
  "routeType",
  "experienceYears",
  "accidents",
  "violations",
  "cdlClass",
  "cdlNumber",
  "availability",
  "previousEmployer",
  "comments",
] as const

const STRING_KEYS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "businessAddress",
  "accidents",
  "violations",
  "cdlNumber",
  "previousEmployer",
  "comments",
] as const

const DRIVER_TYPES: ApplyDriverType[] = [
  "owner-operator-otr",
  "regional-company-driver",
]
const ROUTE_TYPES: ApplyRouteType[] = ["local", "regional", "otr"]

function clean(value: unknown, max = 120): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : undefined
}

function stringMax(key: (typeof STRING_KEYS)[number]): number {
  if (key === "email" || key === "previousEmployer") return 120
  if (key === "businessAddress") return 200
  if (key === "comments") return 2000
  if (key === "cdlNumber") return 40
  if (key === "phone") return 32
  return 80
}

export function isApplyWizardStep(value: unknown): value is ApplyWizardStep {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function isExperienceBucket(value: string): value is ApplyExperienceBucket {
  return (APPLY_EXPERIENCE_BUCKETS as readonly string[]).includes(value)
}

/** "5 years" / "10" / "2 yrs" → the apply-wizard radio bucket. */
export function mapExperienceToApplyBucket(
  raw: string | null | undefined
): ApplyExperienceBucket | undefined {
  if (!raw) return undefined
  const n = parseInt(raw.replace(/\D/g, "") || "", 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  if (n <= 1) return "1"
  if (n === 2) return "2"
  if (n <= 5) return "3-5"
  if (n <= 10) return "6-10"
  return "10+"
}

/** Pre-qualify "None" / "3+" → the apply wizard's numeric accidents field. */
export function mapCountToApply(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (trimmed === "None" || trimmed === "none") return "0"
  if (trimmed === "3+") return "3"
  if (/^\d+$/.test(trimmed)) return trimmed
  return undefined
}

export type PreQualifyDraftInput = {
  firstName: string
  lastName: string
  phone: string
  email: string
  cityState?: string
  ownSleeperTruck?: string
  cdlExperience?: string
  accident5Year?: string
  movingViolations5Year?: string
}

export function draftFromPreQualify(data: PreQualifyDraftInput): ApplyDraft {
  const draft: ApplyDraft = {}
  const firstName = clean(data.firstName, 80)
  const lastName = clean(data.lastName, 80)
  const phone = clean(data.phone, 32)
  const email = clean(data.email, 120)
  const city = clean(data.cityState, 120)
  if (firstName) draft.firstName = firstName
  if (lastName) draft.lastName = lastName
  if (phone) draft.phone = phone
  if (email) draft.email = email
  if (city) draft.businessAddress = city
  if (data.ownSleeperTruck === "Yes") draft.driverType = "owner-operator-otr"
  else if (data.ownSleeperTruck === "No") draft.driverType = "regional-company-driver"
  const exp = mapExperienceToApplyBucket(data.cdlExperience)
  if (exp) draft.experienceYears = exp
  const accidents = mapCountToApply(data.accident5Year)
  if (accidents) draft.accidents = accidents
  const violations = mapCountToApply(data.movingViolations5Year)
  if (violations) draft.violations = violations
  return draft
}

function sanitizeDraft(raw: unknown): ApplyDraft | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const src = raw as Record<string, unknown>
  const out: ApplyDraft = {}
  for (const key of STRING_KEYS) {
    const value = clean(src[key], stringMax(key))
    if (value) out[key] = value
  }
  const driverType = clean(src.driverType)
  if (driverType && DRIVER_TYPES.includes(driverType as ApplyDriverType)) {
    out.driverType = driverType as ApplyDriverType
  }
  const routeType = clean(src.routeType)
  if (routeType && ROUTE_TYPES.includes(routeType as ApplyRouteType)) {
    out.routeType = routeType as ApplyRouteType
  }
  const exp = clean(src.experienceYears)
  if (exp && isExperienceBucket(exp)) out.experienceYears = exp
  const cdlClass = clean(src.cdlClass)
  if (cdlClass && (APPLY_CDL_CLASSES as readonly string[]).includes(cdlClass)) {
    out.cdlClass = cdlClass as ApplyCdlClass
  }
  const availability = clean(src.availability)
  if (availability && (APPLY_AVAILABILITY as readonly string[]).includes(availability)) {
    out.availability = availability as ApplyAvailability
  }
  const stepRaw =
    typeof src.step === "number"
      ? src.step
      : typeof src.step === "string"
        ? Number(src.step)
        : undefined
  if (isApplyWizardStep(stepRaw)) out.step = stepRaw
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Snapshot the wizard after every keystroke / step change.
 * Callers must wait until the pre-qualify draft has been hydrated so
 * empty defaults cannot overwrite a filled session.
 */
export function snapshotFromFormValues(
  values: Record<string, unknown>,
  step: number
): ApplyDraft {
  return sanitizeDraft({ ...values, step }) ?? {}
}

export function saveApplyDraft(draft: ApplyDraft): void {
  if (typeof window === "undefined") return
  try {
    const cleanDraft = sanitizeDraft(draft)
    if (!cleanDraft) return
    window.sessionStorage.setItem(APPLY_DRAFT_KEY, JSON.stringify(cleanDraft))
  } catch {
    /* private mode / full storage — never break the success card */
  }
}

export function readApplyDraft(): ApplyDraft | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.sessionStorage.getItem(APPLY_DRAFT_KEY)
    if (!stored) return null
    return sanitizeDraft(JSON.parse(stored) as unknown)
  } catch {
    return null
  }
}

export function clearApplyDraft(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(APPLY_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Draft fills contact + seat; URL `?type=` / `?lane=` overlays seat/lane.
 */
export function applyValuesFromDraftAndSearch(
  draft: ApplyDraft | null,
  search: string
): ApplyDraft {
  const pref = applyPrefFromSearch(search)
  const out: ApplyDraft = { ...(draft ?? {}) }
  if (pref.driverType) out.driverType = pref.driverType
  if (pref.routeType) out.routeType = pref.routeType
  return out
}
