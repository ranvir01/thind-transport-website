"use server"

import { z } from "zod"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import { saveWebsiteLead } from "@/lib/hub/website-leads"
import { honeypotTripped, publicFormBlocked } from "@/lib/public-form-guard"

const leadSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().min(10).optional(),
  source: z.string().optional(),
  message: z.string().optional(),
})

export type LeadState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function captureLead(prevState: LeadState, formData: FormData): Promise<LeadState> {
  try {
    // Bot filled the invisible field → fake success, no signal to tune on.
    if (honeypotTripped(formData)) {
      return { success: true, message: "Got it — someone from our team will reach out soon." }
    }
    // FormData.get returns null for absent fields; zod .optional() accepts
    // undefined but rejects null — that mismatch silently failed EVERY lead
    // that omitted any optional field (the apply form omits `message`).
    const field = (key: string): string | undefined => {
      const value = formData.get(key)
      return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
    }
    const rawData = {
      name: field("name"),
      email: field("email"),
      phone: field("phone"),
      source: field("source"),
      message: field("message"),
    }

    const validatedData = leadSchema.safeParse(rawData)

    if (!validatedData.success) {
      return {
        success: false,
        message: "Please check your email and phone number.",
        errors: validatedData.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const data = validatedData.data

    // Same copy as the genuine-failure path below: a throttled caller learns
    // nothing beyond "try the phone", which is also the right advice.
    if (await publicFormBlocked(data.email)) {
      return {
        success: false,
        message: `We couldn't save that just now. Call or text ${COMPANY_INFO.phone} and we'll help you directly.`,
      }
    }

    // Database first — with SMTP unset (production today), email-only capture
    // silently discarded every interested driver. The hub's Today screen and
    // /hub/leads read this table, so a saved lead is a SEEN lead.
    const savedToDb = await saveWebsiteLead({
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: data.source,
      driverType: (formData.get("driverType") as string) || null,
      experienceYears: (formData.get("experienceYears") as string) || null,
      message: data.message,
    })

    let emailed = false
    if (isEmailConfigured()) {
      try {
        const transporter = createMailTransport()
        await transporter.sendMail({
          from: mailFrom(),
          to: COMPANY_INFO.email,
          replyTo: data.email,
          subject: `Website lead${data.source ? ` — ${data.source}` : ""}`,
          text: [
            `Name: ${data.name || "—"}`,
            `Email: ${data.email}`,
            `Phone: ${data.phone || "—"}`,
            `Source: ${data.source || "website"}`,
            data.message ? `Message: ${data.message}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        })
        emailed = true
      } catch (err) {
        console.error("Lead email failed (lead is in the DB):", err)
      }
    }

    if (!savedToDb && !emailed) {
      console.error("Lead reached NO destination:", { ...data, timestamp: new Date().toISOString() })
      return {
        success: false,
        message: `We couldn't save that just now. Call or text ${COMPANY_INFO.phone} and we'll help you directly.`,
      }
    }

    return {
      success: true,
      message: "Got it — someone from our team will reach out soon.",
    }
  } catch (error) {
    console.error("Lead capture error:", error)
    return {
      success: false,
      message: `We couldn't save that just now. Call ${COMPANY_INFO.phone} and we'll help you directly.`,
    }
  }
}
