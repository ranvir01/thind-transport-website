import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { findDriverById, getLatestApplicationForDriver } from "@/lib/driver-db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const driver = await findDriverById((session.user as any).id)

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }

    const application = await getLatestApplicationForDriver(driver.id)

    return NextResponse.json({
      id: driver.id,
      email: driver.email,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      createdAt: driver.createdAt,
      applicationCompleted: driver.applicationCompleted || Boolean(application),
      application: application
        ? {
            id: application.id,
            status: application.status,
            submittedAt: application.submittedAt,
            hasPdf: application.hasPdf,
          }
        : null,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

