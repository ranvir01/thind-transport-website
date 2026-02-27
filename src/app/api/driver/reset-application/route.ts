import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { findDriverByEmail } from "@/lib/driver-db"

/**
 * Reset a driver's application data
 * This endpoint resets the application_completed flag and removes any applications
 * The client should also clear localStorage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
    
    const email = session.user.email
    
    // For security, check if the email matches
    const body = await request.json().catch(() => ({}))
    const targetEmail = body.email || email
    
    // Only allow resetting own data or if admin
    if (targetEmail !== email) {
      return NextResponse.json(
        { error: "You can only reset your own application data" },
        { status: 403 }
      )
    }
    
    // Find the driver
    const driver = await findDriverByEmail(targetEmail)
    
    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      )
    }
    
    // Try to use Postgres if available
    if (process.env.POSTGRES_URL) {
      const { sql } = await import("@vercel/postgres")
      
      // Delete any applications for this driver
      await sql`DELETE FROM applications WHERE driver_id = ${driver.id}`
      
      // Reset the application_completed flag
      await sql`UPDATE drivers SET application_completed = false WHERE id = ${driver.id}`
      
      console.log(`Application data reset for driver: ${targetEmail}`)
    } else {
      // For local JSON storage
      const { promises: fs } = await import("fs")
      const path = await import("path")
      
      const APPLICATIONS_FILE = path.join(process.cwd(), "data", "applications.json")
      const DRIVERS_FILE = path.join(process.cwd(), "data", "drivers.json")
      
      try {
        // Read and filter applications
        const appsData = await fs.readFile(APPLICATIONS_FILE, "utf-8")
        const applications = JSON.parse(appsData)
        const filteredApps = applications.filter((app: any) => app.driverId !== driver.id)
        await fs.writeFile(APPLICATIONS_FILE, JSON.stringify(filteredApps, null, 2))
        
        // Update driver
        const driversData = await fs.readFile(DRIVERS_FILE, "utf-8")
        const drivers = JSON.parse(driversData)
        const driverIndex = drivers.findIndex((d: any) => d.id === driver.id)
        if (driverIndex !== -1) {
          drivers[driverIndex].applicationCompleted = false
          await fs.writeFile(DRIVERS_FILE, JSON.stringify(drivers, null, 2))
        }
      } catch (e) {
        console.log("No local data files to reset")
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Application data has been reset. Please also clear your browser's localStorage.",
      clearLocalStorage: `thind_driver_application_${targetEmail}`
    })
    
  } catch (error: any) {
    console.error("Reset application error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reset application data" },
      { status: 500 }
    )
  }
}

