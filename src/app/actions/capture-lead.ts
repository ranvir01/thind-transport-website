"use server"

import { z } from "zod"
import * as nodemailer from "nodemailer"
import { COMPANY_INFO } from "@/lib/constants"

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

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  })
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
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS

    console.log("Lead captured:", { ...data, timestamp: new Date().toISOString() })

    if (smtpUser && smtpPass) {
      const transporter = createTransporter()
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Thind Transport Website" <${smtpUser}>`,
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
