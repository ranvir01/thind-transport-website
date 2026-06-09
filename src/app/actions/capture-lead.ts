"use server"

import { z } from "zod"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"

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
    const rawData = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      source: formData.get("source"),
      message: formData.get("message"),
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

    console.log("Lead captured:", { ...data, timestamp: new Date().toISOString() })

    if (isEmailConfigured()) {
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
