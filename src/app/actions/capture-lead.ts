"use server"

import { z } from "zod"

// Schema for lead capture (quick contact form, newsletter signup, etc.)
const leadSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().min(10).optional(),
  source: z.string().optional(), // Where the lead came from
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
        message: "Please provide valid contact information",
        errors: validatedData.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const data = validatedData.data

    // Log the lead (in production, you'd save to database or CRM)
    console.log("Lead captured:", {
      ...data,
      timestamp: new Date().toISOString(),
    })

    // In production, you might want to:
    // 1. Save to database
    // 2. Send to CRM (HubSpot, Salesforce, etc.)
    // 3. Send confirmation email
    // 4. Trigger webhook to Slack/Teams

    return {
      success: true,
      message: "Thanks! We'll be in touch soon.",
    }
  } catch (error) {
    console.error("Lead capture error:", error)
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    }
  }
}

