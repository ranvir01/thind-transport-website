/**
 * Debug endpoint to test login - REMOVE IN PRODUCTION
 */

import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    console.log("🔍 Debug login attempt for:", email)

    // Get driver with password hash
    const result = await sql`
      SELECT 
        id, 
        email, 
        password_hash,
        first_name, 
        last_name
      FROM drivers 
      WHERE email = ${email}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found",
        email 
      })
    }

    const driver = result.rows[0]
    console.log("Found driver:", driver.email)
    console.log("Password hash exists:", !!driver.password_hash)
    console.log("Password hash length:", driver.password_hash?.length)

    // Try to verify password
    const isValid = await bcrypt.compare(password, driver.password_hash)
    console.log("Password valid:", isValid)

    return NextResponse.json({ 
      success: true,
      userFound: true,
      passwordHashExists: !!driver.password_hash,
      passwordHashLength: driver.password_hash?.length,
      passwordValid: isValid,
      firstName: driver.first_name,
      lastName: driver.last_name
    })
  } catch (error: any) {
    console.error("Debug login error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

