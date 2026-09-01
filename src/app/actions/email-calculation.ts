"use server"

import { z } from "zod"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"

const calculationSchema = z.object({
  email: z.string().email(),
  equipment: z.string().min(1),
  miles: z.number().int().min(500).max(10000),
  lineHaulRate: z.number().min(0.5).max(10),
  fuelPrice: z.number().min(1).max(10),
  weeklyGross: z.number(),
  weeklyNet: z.number(),
  weeklyDifference: z.number(),
  annualNet: z.number(),
})

export type CalculationEmailState = {
  success: boolean
  message: string
}

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

export async function emailCalculation(input: z.infer<typeof calculationSchema>): Promise<CalculationEmailState> {
  const parsed = calculationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: "Please enter a valid email address." }
  }

  const data = parsed.data

  if (!isEmailConfigured()) {
    console.warn("emailCalculation: SMTP not configured — cannot send estimate")
    return {
      success: false,
      message: `Email isn't available right now. Call ${COMPANY_INFO.phone} and we'll walk through the numbers with you.`,
    }
  }

  try {
    const transporter = createMailTransport()

    const summaryLines = [
      `Equipment: ${data.equipment}`,
      `Miles per week: ${data.miles.toLocaleString()}`,
      `Linehaul rate: $${data.lineHaulRate.toFixed(2)}/mi`,
      `Diesel price: $${data.fuelPrice.toFixed(2)}/gal`,
      ``,
      `Estimated weekly gross (91% split + 100% fuel surcharge): ${formatUsd(data.weeklyGross)}`,
      `Estimated weekly net after expenses: ${formatUsd(data.weeklyNet)}`,
      `Estimated extra vs. a typical 72% split: ${formatUsd(data.weeklyDifference)}/week`,
      `Estimated annual net (48 weeks): ${formatUsd(data.annualNet)}`,
    ]

    // Send the estimate to the driver
    await transporter.sendMail({
      from: mailFrom(COMPANY_INFO.name),
      to: data.email,
      subject: `Your earnings estimate — ${COMPANY_INFO.name}`,
      text: [
        `Here's the owner-operator earnings estimate you ran on thindtransport.com:`,
        ``,
        ...summaryLines,
        ``,
        `These are estimates based on current market averages — actual earnings depend on loads, lanes, and your expenses.`,
        ``,
        `Questions? Call ${COMPANY_INFO.phone} or reply to this email.`,
        `Apply any time: https://thindtransport.com/apply`,
        ``,
        `— The ${COMPANY_INFO.name} team, Kent, WA`,
      ].join("\n"),
    })

    // Notify recruiting (this is a warm lead)
    await transporter.sendMail({
      from: mailFrom(`${COMPANY_INFO.name} Website`),
      to: COMPANY_INFO.email,
      replyTo: data.email,
      subject: `Calculator lead — ${data.email}`,
      text: [`A visitor emailed themselves an earnings estimate:`, ``, `Email: ${data.email}`, ``, ...summaryLines].join(
        "\n",
      ),
    })

    return { success: true, message: "Estimate sent! Check your inbox." }
  } catch (error) {
    console.error("emailCalculation error:", error)
    return {
      success: false,
      message: `We couldn't send that just now. Call ${COMPANY_INFO.phone} and we'll help you directly.`,
    }
  }
}
