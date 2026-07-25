/**
 * Honeypot pieces shared by server actions AND client form components —
 * deliberately free of next/headers so client bundles can import it. The
 * server-side throttle lives in public-form-guard.ts.
 */

/** Field name bots find attractive; real users never see it. */
export const HONEYPOT_FIELD = "company_website"

export function honeypotTripped(formData: FormData): boolean {
  const v = formData.get(HONEYPOT_FIELD)
  return typeof v === "string" && v.trim().length > 0
}

/**
 * For forms that assemble their payload from component state instead of the
 * DOM (react-hook-form, JSON posts): pull the rendered honeypot input's value
 * so it still travels with the submission.
 */
export function readHoneypotValue(): string {
  if (typeof document === "undefined") return ""
  const el = document.getElementById(HONEYPOT_FIELD)
  return el instanceof HTMLInputElement ? el.value : ""
}
