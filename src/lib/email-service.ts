/**
 * Email Service for sending application notifications
 */

import nodemailer from "nodemailer"
import type { DriverApplicationFormData } from "@/types/driver-application-form"

const esc = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const yesNo = (yes?: boolean, no?: boolean): string => {
  if (yes) return "Yes"
  if (no) return "No"
  return "Not answered"
}

const row = (label: string, value: unknown): string => {
  const display = value === undefined || value === null || value === "" ? "—" : esc(value)
  return `<tr>
    <td style="padding:6px 10px;color:#64748b;width:200px;vertical-align:top;border-bottom:1px solid #eef2f7;">${esc(label)}</td>
    <td style="padding:6px 10px;color:#0f172a;font-weight:600;border-bottom:1px solid #eef2f7;">${display}</td>
  </tr>`
}

const sectionWrap = (title: string, innerRows: string): string => `
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
    <div style="background:#001F3F;color:#ffffff;padding:10px 14px;font-size:15px;font-weight:700;">${esc(title)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${innerRows}</table>
  </div>`

/**
 * Render a detailed, human-readable HTML summary of a full DOT driver
 * application so the team can review every field directly in the email
 * (in addition to the attached PDF) and decide what to edit before
 * finalizing the paperwork.
 */
export function formatDOTApplicationEmailHtml(
  data: Partial<DriverApplicationFormData>,
  meta?: { driverName?: string; driverEmail?: string; driverPhone?: string }
): string {
  const p = data.personal
  const addr = data.address
  const emp = data.employment
  const acc = data.accidents
  const traf = data.traffic
  const cdl = data.cdl
  const exp = data.experience
  const train = data.training
  const cert = data.certification

  const positions = [
    p?.pos_company_driver && "Company Driver",
    p?.pos_contract_driver && "Contract Driver",
    p?.pos_contractors_driver && "Contractor's Driver",
  ].filter(Boolean).join(", ") || "—"

  const personalSection = sectionWrap("Applicant Information",
    row("Name", p?.applicant_name) +
    row("Email", meta?.driverEmail || p?.email) +
    row("Phone", meta?.driverPhone || p?.phone) +
    row("Emergency Phone", p?.emergency_phone) +
    row("Date of Birth", p?.dob) +
    row("SSN", p?.ssn) +
    row("Physical Exam Expires", p?.physical_exam_exp) +
    row("Med Card State", p?.med_card_state) +
    row("Position Applied For", positions) +
    row("Eligible to work in US", yesNo(p?.legal_work_yes, p?.legal_work_no)) +
    row("21 or older", yesNo(p?.age_21_yes, p?.age_21_no)) +
    row("Can read/speak English", yesNo(p?.english_yes, p?.english_no))
  )

  const addressSection = sectionWrap("Address History",
    row("Current Address", addr?.addr1_street) +
    row("From / To", `${addr?.addr1_from || "—"} → ${addr?.addr1_to || "present"}`) +
    (addr?.addr2_street ? row("Previous Address", addr.addr2_street) + row("From / To", `${addr?.addr2_from || "—"} → ${addr?.addr2_to || "—"}`) : "") +
    (addr?.addr3_street ? row("Previous Address", addr.addr3_street) + row("From / To", `${addr?.addr3_from || "—"} → ${addr?.addr3_to || "—"}`) : "") +
    row("Worked here before", yesNo(addr?.worked_before_yes, addr?.worked_before_no))
  )

  const employers = emp?.employers || []
  const employmentRows = employers.length
    ? employers.map((e, i) =>
        row(`Employer ${i + 1}`, e.name) +
        row("• Dates", `${e.from || "—"} → ${e.to || "—"}`) +
        row("• Address", e.address) +
        row("• Phone", e.phone) +
        row("• Position", e.position) +
        row("• Salary", e.salary) +
        row("• Supervisor", e.supervisor) +
        row("• Reason for Leaving", e.reason) +
        row("• Subject to FMCSRs", yesNo(e.fmcsr_yes, e.fmcsr_no)) +
        row("• Safety-sensitive (drug test)", yesNo(e.drug_yes, e.drug_no))
      ).join("")
    : row("Employers", "None listed")
  const employmentSection = sectionWrap("Employment History",
    employmentRows + (emp?.employment_gaps ? row("Employment Gaps", emp.employment_gaps) : "")
  )

  const accidents = acc?.accidents || []
  const accidentRows = acc?.no_accidents
    ? row("Accidents", "No accidents reported (last 3 years)")
    : (accidents.length
        ? accidents.map((a, i) =>
            row(`Accident ${i + 1}`, a.date) +
            row("• Nature", a.nature) +
            row("• Location", a.location) +
            row("• Fatalities", a.fatalities) +
            row("• Injuries", a.injuries) +
            row("• Hazmat Spill", a.hazmat)
          ).join("")
        : row("Accidents", "None listed"))
  const violations = traf?.violations || []
  const violationRows = traf?.no_violations
    ? row("Violations", "No violations reported (last 3 years)")
    : (violations.length
        ? violations.map((v, i) =>
            row(`Violation ${i + 1}`, v.date) +
            row("• Violation", v.violation) +
            row("• Location", v.location) +
            row("• Vehicle Type", v.vehicle_type) +
            row("• Penalty", v.penalty)
          ).join("")
        : row("Violations", "None listed"))
  const safetySection = sectionWrap("Accidents & Traffic Violations (Last 3 Years)", accidentRows + violationRows)

  const licenses = cdl?.licenses || []
  const licenseRows = licenses.length
    ? licenses.map((l, i) =>
        row(`License ${i + 1}`, `${l.state || "—"} • ${l.number || "—"}`) +
        row("• Class", l.class) +
        row("• Endorsements", l.endorsements) +
        row("• Restrictions", l.restrictions) +
        row("• Expires", l.exp)
      ).join("")
    : row("Licenses", "None listed")
  const cdlSection = sectionWrap("CDL / License Information",
    licenseRows +
    row("Ever denied a license", yesNo(cdl?.denied_yes, cdl?.denied_no)) +
    row("Ever suspended/revoked", yesNo(cdl?.suspended_yes, cdl?.suspended_no)) +
    row("Convicted of a felony", yesNo(cdl?.felony_yes, cdl?.felony_no)) +
    row("DUI/DWI conviction", yesNo(cdl?.dui_yes, cdl?.dui_no)) +
    row("Failed/refused drug test", yesNo(cdl?.failed_drug_yes, cdl?.failed_drug_no)) +
    (cdl?.abc_explanation ? row("Explanation", cdl.abc_explanation) : "")
  )

  const skills = exp ? [
    exp.skill_hazmat && "Hazmat",
    exp.skill_tanker && "Tanker",
    exp.skill_doubles && "Doubles/Triples",
    exp.skill_passenger && "Passenger",
    exp.skill_oversized && "Oversized",
    exp.skill_refrigerated && "Refrigerated",
    exp.skill_flatbed && "Flatbed",
    exp.skill_forklift && "Forklift",
    exp.skill_chains && "Chains",
    exp.skill_canada && "Canada",
    exp.skill_mexico && "Mexico",
    exp.skill_twic && "TWIC",
  ].filter(Boolean).join(", ") : ""
  const experienceSection = sectionWrap("Driving Experience & Skills",
    row("States Operated", exp?.states_operated) +
    row("Equipment Skills", skills || "—") +
    (exp?.other_skills ? row("Other Skills", exp.other_skills) : "")
  )

  const trainingItems = train?.training || []
  const trainingSection = sectionWrap("Training, References & Military",
    (trainingItems.length
      ? trainingItems.map((t, i) => row(`Training ${i + 1}`, `${t.name || "—"}${t.date ? ` (${t.date})` : ""}`)).join("")
      : row("Training", "None listed")) +
    (train?.safe_driving_awards ? row("Safe Driving Awards", train.safe_driving_awards) : "") +
    row("Military Service", yesNo(train?.military_yes, train?.military_no)) +
    (train?.ref1_name ? row("Reference 1", `${train.ref1_name} • ${train.ref1_phone || ""} • ${train.ref1_relationship || ""}`) : "") +
    (train?.ref2_name ? row("Reference 2", `${train.ref2_name} • ${train.ref2_phone || ""} • ${train.ref2_relationship || ""}`) : "") +
    (train?.ref3_name ? row("Reference 3", `${train.ref3_name} • ${train.ref3_phone || ""} • ${train.ref3_relationship || ""}`) : "")
  )

  const certSection = sectionWrap("Certification & Signature",
    row("Signed By", cert?.main_signature) +
    row("Printed Name", cert?.main_printed_name) +
    row("Sign Date", cert?.main_sign_date) +
    row("E-Signature Consent", cert?.e_signature_consent ? "Yes" : "No") +
    row("Do not contact current employer", cert?.do_not_contact_current ? "Yes" : "No") +
    (cert?.signature_ip ? row("Signature IP", cert.signature_ip) : "") +
    (cert?.signature_timestamp ? row("Signature Timestamp", cert.signature_timestamp) : "")
  )

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#0f172a;">
  <div style="max-width:680px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#001F3F,#003366);padding:24px;border-radius:10px 10px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">New DOT Driver Application</h1>
      <p style="color:#fdba74;margin:8px 0 0;font-size:14px;">${esc(meta?.driverName || p?.applicant_name || "Applicant")} • Thind Transport LLC</p>
    </div>
    <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
      <p style="margin:0 0 16px;font-size:13px;color:#475569;background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 12px;border-radius:4px;">
        The full DOT application PDF is attached. The complete field-by-field summary below is included so you can review,
        edit, and resend as needed before finalizing the paperwork.
      </p>
      ${personalSection}
      ${addressSection}
      ${employmentSection}
      ${safetySection}
      ${cdlSection}
      ${experienceSection}
      ${trainingSection}
      ${certSection}
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
        Submitted ${esc(new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }))} via the Thind Transport driver portal.
      </p>
    </div>
  </div>
</body>
</html>`
}

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

