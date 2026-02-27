/**
 * Email Service for sending application notifications
 */

import nodemailer from "nodemailer"

interface ApplicationEmailData {
  to: string
  driverName: string
  driverEmail: string
  driverPhone: string
  pdfBuffer: Buffer
  filename: string
}

export async function sendApplicationEmail(data: ApplicationEmailData) {
  // Configure transporter - Update with your SMTP settings
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@thindtransport.com",
    to: data.to,
    subject: `New Driver Application - ${data.driverName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d; border-bottom: 3px solid #f97316; padding-bottom: 10px;">
          New Driver Application Received
        </h2>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Applicant Information:</h3>
          <p><strong>Name:</strong> ${data.driverName}</p>
          <p><strong>Email:</strong> ${data.driverEmail}</p>
          <p><strong>Phone:</strong> ${data.driverPhone}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US')}</p>
        </div>

        <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <p style="margin: 0;">
            📎 <strong>The completed DOT application form is attached as a PDF.</strong>
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from your Thind Transport website driver application system.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: data.filename,
        content: data.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Application email sent successfully to ${data.to}`)
  } catch (error) {
    console.error("Failed to send application email:", error)
    throw new Error("Failed to send email notification")
  }
}

// Send initial contact form email (existing apply now form)
export async function sendContactFormEmail(data: {
  name: string
  email: string
  phone: string
  experience?: string
  message?: string
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@thindtransport.com",
    to: "thindcarrier@gmail.com",
    subject: `New Contact Form - ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d; border-bottom: 3px solid #f97316; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          ${data.experience ? `<p><strong>Experience:</strong> ${data.experience}</p>` : ""}
          ${data.message ? `<p><strong>Message:</strong><br>${data.message}</p>` : ""}
          <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US')}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from your Thind Transport website.
        </p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}

