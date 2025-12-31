import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { saveApplication, updateApplicationPDFPath, findDriverById } from "@/lib/driver-db"
import { generateDriverApplicationPDF } from "@/lib/pdf-generator"
import { sendApplicationEmail } from "@/lib/email-service"

export async function POST(request: Request) {
  try {
    const applicationData = await request.json()

    // Validate required data
    if (!applicationData.driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 }
      )
    }

    // Verify driver exists
    const driver = await findDriverById(applicationData.driverId)
    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    // Save application to database
    const application = await saveApplication(applicationData.driverId, applicationData)

    // Generate PDF
    const pdfBuffer = await generateDriverApplicationPDF(applicationData)

    // Save PDF to file system
    const uploadsDir = path.join(process.cwd(), "uploads", "applications")
    await fs.mkdir(uploadsDir, { recursive: true })

    const filename = `${driver.lastName}_${driver.firstName}_${application.id}.pdf`
    const filepath = path.join(uploadsDir, filename)
    await fs.writeFile(filepath, pdfBuffer)

    // Update application with PDF path
    await updateApplicationPDFPath(application.id, filepath)

    // Send email with PDF attachment
    await sendApplicationEmail({
      to: "thindcarrier@gmail.com",
      driverName: `${driver.firstName} ${driver.lastName}`,
      driverEmail: driver.email,
      driverPhone: driver.phone,
      pdfBuffer,
      filename,
    })

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: application.id,
    })
  } catch (error: any) {
    console.error("Application submission error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    )
  }
}

