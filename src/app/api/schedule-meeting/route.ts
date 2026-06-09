import { NextResponse } from "next/server"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const { name, email, phone, preferredDate, preferredTime, meetingType, notes } = body

    // Basic validation so we never email blank requests or crash on missing fields
    const isEmail = typeof email === "string" && /.+@.+\..+/.test(email)
    if (!name || !isEmail || !phone || !preferredDate || !preferredTime) {
      return NextResponse.json(
        { error: "Please fill in your name, a valid email, phone, and a preferred date and time." },
        { status: 400 }
      )
    }

    // Gracefully degrade when email isn't configured (matches the server actions)
    if (!isEmailConfigured()) {
      console.log("Meeting request received (email not configured):", { name, email, phone, preferredDate, preferredTime })
      return NextResponse.json({ success: true })
    }

    // Configure transporter
    const transporter = createMailTransport()

    // Send email to owner
    await transporter.sendMail({
      from: mailFrom("Thind Transport"),
      to: "thindcarrier@gmail.com",
      subject: `Meeting Request - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d; border-bottom: 3px solid #f97316; padding-bottom: 10px;">
            New Meeting Request
          </h2>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Contact Information:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Meeting Details:</h3>
            <p><strong>Preferred Date:</strong> ${preferredDate}</p>
            <p><strong>Preferred Time:</strong> ${preferredTime}</p>
            <p><strong>Meeting Type:</strong> ${meetingType === "phone" ? "📞 Phone Call" : "📹 Video Call"}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Please confirm the meeting and send a calendar invite to ${email}
          </p>
        </div>
      `,
    })

    // Send confirmation to driver
    await transporter.sendMail({
      from: mailFrom("Thind Transport"),
      to: email,
      subject: "Meeting Request Received - Thind Transport",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Meeting Request Received</h2>
          
          <p>Dear ${name},</p>
          
          <p>Thank you for your interest in joining Thind Transport! We've received your meeting request.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Requested Time:</strong> ${preferredDate} at ${preferredTime} (Pacific Time)</p>
            <p><strong>Meeting Type:</strong> ${meetingType === "phone" ? "Phone Call" : "Video Call"}</p>
          </div>
          
          <p>We'll review your request and send you a calendar confirmation within 24 hours.</p>
          
          <p><strong>What to prepare:</strong></p>
          <ul>
            <li>Your CDL information</li>
            <li>Recent driving experience</li>
            <li>Questions about our 90% owner-operator program</li>
          </ul>
          
          <p>If you have urgent questions, call us at ${COMPANY_INFO.phone}.</p>
          
          <p>Best regards,<br>Thind Transport Team</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Meeting scheduling error:", error)
    return NextResponse.json(
      { error: "Failed to schedule meeting" },
      { status: 500 }
    )
  }
}

