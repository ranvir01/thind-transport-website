import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, preferredDate, preferredTime, meetingType, notes } = body

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Send email to owner
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@thindtransport.com",
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
      from: process.env.SMTP_FROM || "noreply@thindtransport.com",
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
            <li>Questions about our 91% owner-operator program</li>
          </ul>
          
          <p>If you have urgent questions, call us at (206) 765-6300.</p>
          
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

