/**
 * Step-2 lead capture for the /apply wizard, designed to be fired WITHOUT
 * awaiting it. The server action inserts the lead (DB first, then a
 * notification email when SMTP is configured) — a full round trip that can
 * take seconds on truck-stop cell service. The wizard never uses the result
 * to gate advancement (a failed capture still advances; dispatch follow-up
 * is the safety net), so blocking the Continue tap on it was pure perceived
 * latency at the most abandonment-sensitive moment of the funnel.
 *
 * Contract: fireLeadCapture never rejects — background failures are logged
 * and swallowed so an SMTP hiccup can never surface as an unhandled
 * rejection in the driver's browser.
 */
import { captureLead, type LeadState } from "@/app/actions/capture-lead"
import { HONEYPOT_FIELD } from "@/lib/honeypot"
import { ATTRIBUTION_FIELD, readAttribution, serializeAttribution } from "@/lib/attribution"

export type LeadCaptureValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  driverType: string
  experienceYears: string
}

type LeadAction = (prevState: LeadState, formData: FormData) => Promise<LeadState>

export function buildLeadFormData(values: LeadCaptureValues, honeypotValue: string): FormData {
  const formData = new FormData()
  formData.append("name", `${values.firstName} ${values.lastName}`)
  formData.append("phone", values.phone)
  formData.append("email", values.email)
  formData.append("driverType", values.driverType)
  formData.append("experienceYears", values.experienceYears)
  formData.append("source", "Application Form Step 2")
  // This form builds its FormData by hand rather than from a <form>, so the
  // hidden AttributionField never renders — read it from session storage
  // directly. Without this the driver funnel, which is the highest-value one,
  // would be the only unattributed path on the site.
  const attribution = serializeAttribution(readAttribution())
  if (attribution) formData.append(ATTRIBUTION_FIELD, attribution)
  if (honeypotValue) formData.append(HONEYPOT_FIELD, honeypotValue)
  return formData
}

/** Fire the capture in the background. Resolves to whether it succeeded; never rejects. */
export function fireLeadCapture(
  values: LeadCaptureValues,
  honeypotValue: string,
  action: LeadAction = captureLead
): Promise<boolean> {
  try {
    return action({ success: false, message: "" }, buildLeadFormData(values, honeypotValue))
      .then((result) => result.success)
      .catch((err) => {
        console.error("Background lead capture failed (driver already advanced):", err)
        return false
      })
  } catch (err) {
    console.error("Background lead capture failed (driver already advanced):", err)
    return Promise.resolve(false)
  }
}
