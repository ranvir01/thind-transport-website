/**
 * Debug endpoint to check database state
 * Shows all driver accounts for troubleshooting
 */

import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    // Get all drivers (without sensitive password data)
    const result = await sql`
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        invitation_code,
        created_at,
        application_completed
      FROM drivers 
      ORDER BY created_at DESC
    `

    return NextResponse.json({ 
      success: true,
      totalDrivers: result.rowCount,
      drivers: result.rows
    })
  } catch (error: any) {
    console.error("Debug error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

