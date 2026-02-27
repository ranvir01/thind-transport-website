"use server"

import { z } from "zod"
import * as nodemailer from "nodemailer"

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

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function submitPreQualification(prevState: PreQualifyState, formData: FormData): Promise<PreQualifyState> {
  try {
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
      suspensionDetails: formData.get("suspensionDetails"),
      
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

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("Pre-Qualification Received (email not sent):", data)
      return {
        success: true,
        message: "Pre-qualification submitted successfully! We will contact you shortly.",
      }
    }

    const isQualified = checkQualification(data)

    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"Thind Transport Website" <${process.env.EMAIL_USER}>`,
      to: "thindcarrier@gmail.com",
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

    await transporter.sendMail(mailOptions)

    return {
      success: true,
      message: "Pre-qualification submitted successfully!",
      isQualified: isQualified,
    }
  } catch (error) {
    console.error("Submission error:", error)
    return {
      success: false,
      message: "Something went wrong. Please try again or call (206) 765-6300.",
    }
  }
}

