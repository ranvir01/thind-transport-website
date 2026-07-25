"use server"

import { z } from "zod"
import { COMPANY_INFO } from "@/lib/constants"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import { savePublicApplication, markPublicApplicationEmailed } from "@/lib/driver-db"
import { honeypotTripped, publicFormBlocked } from "@/lib/public-form-guard"
import { saveWebsiteLead } from "@/lib/hub/website-leads"

const preQualifySchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(2, "Last Name is required"),
  phone: z.string().min(10, "Phone number is too short"),
  email: z.string().email("Invalid email address"),
  cityState: z.string().min(2, "City / State is required"),
  
  ownSleeperTruck: z.string().min(1, "Required"),
  cdlExperience: z.string().min(1, "Required"),
  canDriveManual: z.string().min(1, "Required"),
  paidBiMonthly: z.string().min(1, "Required"),
  runLower40: z.string().min(1, "Required"),
  runWaToAnywhere: z.string().min(1, "Required"),
  homeTimeDuration: z.string().min(1, "Required"),
  jobsInLast3Years: z.string().min(1, "Required"),
  suspensionDetails: z.string().optional(),
  
  hasRiderOrPet: z.string().min(1, "Required"),
  isSapDriver: z.string().min(1, "Required"),
  hasFelony: z.string().min(1, "Required"),
  accident5Year: z.string().min(1, "Required"),
  movingViolations5Year: z.string().min(1, "Required"),
})

export type PreQualifyState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  isQualified?: boolean
}

// Logic to check qualification
const checkQualification = (data: any): boolean => {
  // Critical Disqualifiers
  if (data.isSapDriver === "Yes") return false
  if (data.hasFelony === "Yes") return false
  
  // Experience Check (Parse number)
  const exp = parseInt(data.cdlExperience.replace(/\D/g, "") || "0")
  if (exp < 2) return false

  // Safety Check
  if (data.accident5Year !== "None" && data.accident5Year !== "0") return false
  
  // Operational Requirements
  if (data.runLower40 === "No") return false
  if (data.runWaToAnywhere === "No") return false
  if (data.paidBiMonthly === "No") return false

  return true
}

export async function submitPreQualification(prevState: PreQualifyState, formData: FormData): Promise<PreQualifyState> {
  try {
    // Bot filled the invisible field → fake success, no signal to tune on.
    if (honeypotTripped(formData)) {
      return { success: true, message: "Pre-qualification submitted successfully! We will contact you shortly." }
    }
    const rawData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      cityState: formData.get("cityState"),
      
      ownSleeperTruck: formData.get("ownSleeperTruck"),
      cdlExperience: formData.get("cdlExperience"),
      canDriveManual: formData.get("canDriveManual"),
      paidBiMonthly: formData.get("paidBiMonthly"),
      runLower40: formData.get("runLower40"),
      runWaToAnywhere: formData.get("runWaToAnywhere"),
      homeTimeDuration: formData.get("homeTimeDuration"),
      jobsInLast3Years: formData.get("jobsInLast3Years"),
      // FormData.get returns null for absent fields; zod .optional() accepts
      // undefined but rejects null (the exact bug that once ate every
      // captureLead submission). The client currently always appends this
      // field, but don't let the only optional field be a landmine.
      suspensionDetails: formData.get("suspensionDetails") ?? undefined,
      
      hasRiderOrPet: formData.get("hasRiderOrPet"),
      isSapDriver: formData.get("isSapDriver"),
      hasFelony: formData.get("hasFelony"),
      accident5Year: formData.get("accident5Year"),
      movingViolations5Year: formData.get("movingViolations5Year"),
    }

    const validatedData = preQualifySchema.safeParse(rawData)

    if (!validatedData.success) {
      return {
        success: false,
        message: "Please fix the errors in the form",
        errors: validatedData.error.flatten().fieldErrors,
      }
    }

    const data = validatedData.data

    if (await publicFormBlocked(data.email)) {
      return {
        success: false,
        message: `Something went wrong. Please try again or call ${COMPANY_INFO.phone}.`,
      }
    }

    const isQualified = checkQualification(data)

    // Speed-to-lead surface first: /hub/leads and the Today card read
    // hub.website_leads. The legacy public_applications row below is only
    // reachable through a manual "Import" on the recruiting board, so without
    // this a completed pre-qualification — name + phone + every qualifying
    // answer, the hottest lead the site produces — never surfaced for the
    // same-hour callback the funnel is built around (apply step 2 and the
    // shipper quote form already land here via captureLead).
    const leadSaved = await saveWebsiteLead({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      source: `Pre-qualification (${isQualified ? "qualified" : "needs review"})`,
      driverType: data.ownSleeperTruck === "Yes" ? "owner-operator" : null,
      experienceYears: data.cdlExperience,
      message: `${data.cityState} · Home time: ${data.homeTimeDuration}`,
    })

    // Persist the full answer set — never lose a lead because email is down.
    let savedRecordId: string | null = null
    try {
      const saved = await savePublicApplication({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        driverType: "pre-qualification",
        data: { ...data, isQualified },
        emailDelivered: false,
      })
      savedRecordId = saved.id
    } catch (persistError) {
      console.error("Failed to persist pre-qualification:", persistError)
    }

    if (!isEmailConfigured()) {
      if (!savedRecordId && !leadSaved) {
        // Nothing persisted and no email path — telling the driver "success"
        // here would silently eat the lead. Same doctrine as captureLead.
        console.error("Pre-qualification reached NO destination:", data.email)
        return {
          success: false,
          message: `Something went wrong on our end. Please call ${COMPANY_INFO.phone} and we'll take your info directly.`,
        }
      }
      console.warn("SMTP not configured — pre-qualification stored but not emailed:", data.email)
      return {
        success: true,
        message: "Pre-qualification submitted successfully! We will contact you shortly.",
        isQualified,
      }
    }

    const transporter = createMailTransport()
    
    const mailOptions = {
      from: mailFrom(),
      to: COMPANY_INFO.email,
      replyTo: data.email,
      subject: `${isQualified ? "✅ QUALIFIED" : "⚠️ REVIEW NEEDED"}: New Pre-Qualification - ${data.firstName} ${data.lastName}`,
      html: `
        <h1 style="color: ${isQualified ? "green" : "orange"}">
          ${isQualified ? "✅ Applicant Qualified" : "⚠️ Review Needed"}
        </h1>
        <h2>Basic Information</h2>
        <ul>
          <li><strong>Name:</strong> ${data.firstName} ${data.lastName}</li>
          <li><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></li>
          <li><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
          <li><strong>City/State:</strong> ${data.cityState}</li>
        </ul>
        
        <h2>Driver Qualifications</h2>
        <ul>
          <li><strong>Own Sleeper Truck:</strong> ${data.ownSleeperTruck}</li>
          <li><strong>CDL Experience:</strong> ${data.cdlExperience}</li>
          <li><strong>Can Drive Manual:</strong> ${data.canDriveManual}</li>
          <li><strong>Paid 1st & 15th:</strong> ${data.paidBiMonthly}</li>
          <li><strong>Run Lower 40:</strong> ${data.runLower40}</li>
          <li><strong>Run WA to Anywhere:</strong> ${data.runWaToAnywhere}</li>
          <li><strong>Home Time:</strong> ${data.homeTimeDuration}</li>
          <li><strong>Jobs in Last 3 Years:</strong> ${data.jobsInLast3Years}</li>
          <li><strong>Suspension Details:</strong> ${data.suspensionDetails || "None"}</li>
          <li><strong>Rider/Pet:</strong> ${data.hasRiderOrPet}</li>
          <li><strong>SAP Driver:</strong> ${data.isSapDriver}</li>
          <li><strong>Felony:</strong> ${data.hasFelony}</li>
          <li><strong>Accidents (5 Years):</strong> ${data.accident5Year}</li>
          <li><strong>Moving Violations (5 Years):</strong> ${data.movingViolations5Year}</li>
        </ul>
      `
    }

    try {
      await transporter.sendMail(mailOptions)
      if (savedRecordId) await markPublicApplicationEmailed(savedRecordId)
    } catch (emailError) {
      console.error("Pre-qualification email delivery failed (record saved):", emailError)
      if (!savedRecordId && !leadSaved) {
        return {
          success: false,
          message: `Something went wrong on our end. Please call ${COMPANY_INFO.phone} and we'll take your info directly.`,
        }
      }
      // Saved — treat as success for the driver.
    }

    return {
      success: true,
      message: "Pre-qualification submitted successfully!",
      isQualified: isQualified,
    }
  } catch (error) {
    console.error("Submission error:", error)
    return {
      success: false,
      message: `Something went wrong. Please try again or call ${COMPANY_INFO.phone}.`,
    }
  }
}

