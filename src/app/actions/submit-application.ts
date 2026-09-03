"use server"

import { z } from "zod"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import { savePublicApplication, markPublicApplicationEmailed } from "@/lib/driver-db"
import { honeypotTripped, publicFormBlocked } from "@/lib/public-form-guard"

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

/**
 * Wire values → the words a recruiter reads.
 *
 * The lane label used to be a two-way ternary (`otr` or "Regional"), so when
 * the form gained a Local option (apply-progress.ts / ApplicationForm.tsx) a
 * driver who asked for home-daily work would have been emailed — and filed —
 * as "Regional". Same trap on driver type: the label said "(Regional)" for
 * every company driver. Maps, not ternaries, so the next option added to the
 * form shows up here as a missing key instead of a silently wrong word.
 */
const DRIVER_TYPE_LABELS: Record<string, string> = {
  "owner-operator-otr": "Owner Operator (OTR)",
  "regional-company-driver": "Company Driver",
}

const ROUTE_TYPE_LABELS: Record<string, string> = {
  local: "Local",
  regional: "Regional",
  otr: "OTR (Over The Road)",
}

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: "Immediately",
  "1week": "Within 1 week",
  "2weeks": "Within 2 weeks",
  "1month": "Within 1 month",
}

const labelFor = (map: Record<string, string>, value: string) => map[value] ?? value

// Format application data into HTML email
const formatApplicationEmail = (data: z.infer<typeof applicationSchema>) => {
  const driverTypeLabel = labelFor(DRIVER_TYPE_LABELS, data.driverType)
  const availabilityLabel = labelFor(AVAILABILITY_LABELS, data.availability)
  const routeTypeLabel = labelFor(ROUTE_TYPE_LABELS, data.routeType)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Driver Application</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #D94B45, #C53C37); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
  const driverTypeLabel = labelFor(DRIVER_TYPE_LABELS, data.driverType)

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
Route Type: ${labelFor(ROUTE_TYPE_LABELS, data.routeType)}
Availability: ${labelFor(AVAILABILITY_LABELS, data.availability)}

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
    // Bot filled the invisible field → fake success, no signal to tune on.
    if (honeypotTripped(formData)) {
      return { success: true, message: "Application submitted successfully! Our team will contact you within one business day." }
    }
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

    // This action is the most expensive of the public four (email + PDF), so
    // it gets the same throttle. Copy matches the ordinary failure path.
    if (await publicFormBlocked(data.email)) {
      return {
        success: false,
        message: `We hit a technical issue saving your application. Please call ${COMPANY_INFO.phone} or text us — we'll take your info directly.`,
      }
    }

    const applicantName = `${data.firstName} ${data.lastName}`

    // 1) Persist FIRST — the application must never be lost because email is down.
    let savedRecordId: string | null = null
    try {
      const saved = await savePublicApplication({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        driverType: data.driverType,
        // Store the resolved labels alongside the wire values so the hub lead
        // record reads "Local" rather than leaving the reader to decode "local".
        data: {
          ...data,
          driverTypeLabel: labelFor(DRIVER_TYPE_LABELS, data.driverType),
          routeTypeLabel: labelFor(ROUTE_TYPE_LABELS, data.routeType),
          availabilityLabel: labelFor(AVAILABILITY_LABELS, data.availability),
          attachmentNames: attachments.map((a) => a.filename),
        },
        emailDelivered: false,
      })
      savedRecordId = saved.id
    } catch (persistError) {
      console.error("Failed to persist public application:", persistError)
    }

    // 2) Then attempt email delivery.
    if (!isEmailConfigured()) {
      console.warn("SMTP not configured — application stored but not emailed:", {
        name: applicantName,
        email: data.email,
      })
      return {
        success: true,
        message: "Application received! Our team will contact you within one business day.",
      }
    }

    try {
      const transporter = createMailTransport()
      const driverTypeShort = data.driverType === "owner-operator-otr" ? "O/O" : "Company"

      await transporter.sendMail({
        from: mailFrom(),
        to: COMPANY_INFO.email,
        replyTo: data.email,
        subject: `🚛 New ${driverTypeShort} Application: ${applicantName}`,
        html: formatApplicationEmail(data),
        text: formatPlainTextEmail(data),
        attachments: attachments,
      })

      if (savedRecordId) await markPublicApplicationEmailed(savedRecordId)

      console.log("Application submitted successfully:", {
        name: applicantName,
        email: data.email,
        type: data.driverType,
      })
    } catch (emailError) {
      // The application is already saved — never surface SMTP internals to the driver.
      console.error("Application email delivery failed (record saved):", emailError)
      if (savedRecordId) {
        return {
          success: true,
          message: "Application received! Our team will contact you within one business day.",
        }
      }
      // Persistence AND email both failed — only now ask the driver to reach out directly.
      return {
        success: false,
        message: `We hit a technical issue saving your application. Please call ${COMPANY_INFO.phone} or text us — we'll take your info directly.`,
      }
    }

    return {
      success: true,
      message: "Application submitted successfully! Our team will contact you within one business day.",
    }
  } catch (error) {
    console.error("Submission error:", error)
    return {
      success: false,
      message: `Something went wrong on our end. Call ${COMPANY_INFO.phone} or email ${COMPANY_INFO.email} and we'll pick it up from there.`,
    }
  }
}
