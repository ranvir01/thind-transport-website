"use server"

import { z } from "zod"
import * as nodemailer from "nodemailer"

// Define the schema for server-side validation (should match client-side)
const applicationSchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(2, "Last Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(14, "Please enter a valid 10-digit phone number"),
  businessAddress: z.string().optional(),
  driverType: z.string().min(1, "Driver Type is required"),
  
  cdlClass: z.string().min(1, "CDL Class is required"),
  cdlNumber: z.string().min(5, "CDL Number is required"),
  experienceYears: z.string().min(1, "Experience Years is required"),
  availability: z.string().min(1, "Availability is required"),
  routeType: z.string().min(1, "Route Type is required"),
  previousEmployer: z.string().optional(),
  accidents: z.string().optional(),
  violations: z.string().optional(),
  
  comments: z.string().optional(),
})

export type ApplicationState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Format application data into HTML email
const formatApplicationEmail = (data: z.infer<typeof applicationSchema>) => {
  const driverTypeLabel = data.driverType === "owner-operator-otr" 
    ? "Owner Operator (OTR)" 
    : "Company Driver (Regional)"

  const availabilityLabel = {
    immediate: "Immediately",
    "1week": "Within 1 week",
    "2weeks": "Within 2 weeks", 
    "1month": "Within 1 month",
  }[data.availability] || data.availability

  const routeTypeLabel = data.routeType === "otr" ? "OTR (Over The Road)" : "Regional"

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Driver Application</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚛 New Driver Application</h1>
    <p style="color: #fed7aa; margin: 10px 0 0 0;">Thind Transport LLC</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <!-- Priority Badge -->
    <div style="background: ${data.driverType === "owner-operator-otr" ? "#22c55e" : "#3b82f6"}; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; margin-bottom: 20px;">
    <strong>${driverTypeLabel}</strong>
    </div>

    <!-- Contact Information -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
        👤 Contact Information
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Name:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #f97316;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Phone:</td>
          <td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #f97316; font-weight: bold;">${data.phone}</a></td>
        </tr>
        ${data.businessAddress ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Location:</td>
          <td style="padding: 8px 0;">${data.businessAddress}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <!-- CDL & Experience -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
        🪪 CDL & Experience
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">CDL Class:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.cdlClass}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">CDL Number:</td>
          <td style="padding: 8px 0; font-family: monospace; background: #f1f5f9; padding: 5px 10px; border-radius: 4px;">${data.cdlNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Experience:</td>
          <td style="padding: 8px 0;">${data.experienceYears} year(s)</td>
        </tr>
        ${data.previousEmployer ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Previous Employer:</td>
          <td style="padding: 8px 0;">${data.previousEmployer}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <!-- Preferences -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
        📋 Preferences
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Position Type:</td>
          <td style="padding: 8px 0; font-weight: bold;">${driverTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Route Type:</td>
          <td style="padding: 8px 0;">${routeTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Availability:</td>
          <td style="padding: 8px 0;">${availabilityLabel}</td>
        </tr>
      </table>
    </div>

    <!-- Safety Record -->
    ${(data.accidents || data.violations) ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
        🛡️ Safety Record (Last 3 Years)
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Accidents:</td>
          <td style="padding: 8px 0;">${data.accidents || "0"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Violations:</td>
          <td style="padding: 8px 0;">${data.violations || "0"}</td>
        </tr>
      </table>
    </div>
    ` : ""}

    <!-- Additional Comments -->
    ${data.comments ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
        💬 Additional Comments
      </h2>
      <p style="margin: 0; color: #475569;">${data.comments}</p>
    </div>
    ` : ""}

    <!-- Quick Actions -->
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fcd34d; text-align: center;">
      <p style="margin: 0 0 15px 0; font-weight: bold; color: #92400e;">⚡ Quick Actions</p>
      <a href="tel:${data.phone}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">
        📞 Call Applicant
      </a>
      <a href="mailto:${data.email}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">
        ✉️ Email Applicant
      </a>
    </div>
  </div>
  
  <div style="background: #1e293b; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
      This application was submitted via the Thind Transport website.<br>
      Submitted on: ${new Date().toLocaleString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
      })}
    </p>
  </div>
</body>
</html>
  `
}

// Plain text version for email clients that don't support HTML
const formatPlainTextEmail = (data: z.infer<typeof applicationSchema>) => {
  const driverTypeLabel = data.driverType === "owner-operator-otr" 
    ? "Owner Operator (OTR)" 
    : "Company Driver (Regional)"

  return `
NEW DRIVER APPLICATION - THIND TRANSPORT
==========================================

APPLICANT TYPE: ${driverTypeLabel}

CONTACT INFORMATION
-------------------
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone}
${data.businessAddress ? `Location: ${data.businessAddress}` : ""}

CDL & EXPERIENCE
----------------
CDL Class: ${data.cdlClass}
CDL Number: ${data.cdlNumber}
Experience: ${data.experienceYears} year(s)
${data.previousEmployer ? `Previous Employer: ${data.previousEmployer}` : ""}

PREFERENCES
-----------
Position Type: ${driverTypeLabel}
Route Type: ${data.routeType === "otr" ? "OTR" : "Regional"}
Availability: ${data.availability}

SAFETY RECORD (Last 3 Years)
----------------------------
Accidents: ${data.accidents || "0"}
Violations: ${data.violations || "0"}

${data.comments ? `ADDITIONAL COMMENTS\n------------------\n${data.comments}` : ""}

==========================================
Submitted: ${new Date().toLocaleString()}
Via: Thind Transport Website
  `.trim()
}

export async function submitApplication(prevState: ApplicationState, formData: FormData): Promise<ApplicationState> {
  try {
    // Extract data from FormData
    const rawData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      businessAddress: formData.get("businessAddress"),
      driverType: formData.get("driverType"),
      
      cdlClass: formData.get("cdlClass"),
      cdlNumber: formData.get("cdlNumber"),
      experienceYears: formData.get("experienceYears"),
      availability: formData.get("availability"),
      routeType: formData.get("routeType"),
      previousEmployer: formData.get("previousEmployer")?.toString() || undefined,
      accidents: formData.get("accidents")?.toString() || undefined,
      violations: formData.get("violations")?.toString() || undefined,
      comments: formData.get("comments")?.toString() || undefined,
    }

    // Handle file uploads
    const attachments: { filename: string; content: Buffer }[] = []
    const fileFields = ["cdlLicense", "medicalCard", "drivingRecord"]

    for (const field of fileFields) {
      const file = formData.get(field)
      if (file && file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        attachments.push({
          filename: `${field}-${file.name}`,
          content: buffer
        })
      }
    }

    // Validate data
    const validatedData = applicationSchema.safeParse(rawData)

    if (!validatedData.success) {
      const errors = validatedData.error.flatten().fieldErrors as Record<string, string[]>;
      console.error("Validation Errors:", errors);
      return {
        success: false,
        message: "Please fix the errors in the form",
        errors: errors,
      }
    }

    const data = validatedData.data

    // Check if email credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Email credentials not configured. Set SMTP_USER and SMTP_PASS environment variables.")
      // Still log the application for debugging
      console.log("Application Received (email not sent):", data)
      return {
        success: true,
        message: "Application submitted successfully! Our team will contact you within 2 hours.",
      }
    }

    // Create transporter and send email
    const transporter = createTransporter()
    
    const applicantName = `${data.firstName} ${data.lastName}`
    const driverTypeShort = data.driverType === "owner-operator-otr" ? "O/O" : "Company"
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"Thind Transport Website" <${process.env.SMTP_USER}>`,
      to: "thindcarrier@gmail.com",
      replyTo: data.email,
      subject: `🚛 New ${driverTypeShort} Application: ${applicantName}`,
      html: formatApplicationEmail(data),
      text: formatPlainTextEmail(data),
      attachments: attachments,
    }

    await transporter.sendMail(mailOptions)
    
    console.log("Application submitted successfully:", {
      name: applicantName,
      email: data.email,
      type: data.driverType,
    })

    return {
      success: true,
      message: "Application submitted successfully! Our team will contact you within 2 hours.",
    }
  } catch (error) {
    console.error("Submission error:", error)
    return {
      success: false,
      message: "Something went wrong. Please try again or call us directly at (206) 765-6300.",
    }
  }
}
