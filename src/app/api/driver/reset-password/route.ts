/**
 * Reset Password API Route
 * Validates token and updates the password
 */

import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import bcrypt from "bcrypt"

export async function POST(request: Request) {
  try {
    const { token, email, newPassword } = await request.json()

    console.log("[RESET-PASSWORD] Request received for email:", email)

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Ensure reset token columns exist
    try {
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token TEXT`
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`
    } catch (alterError) {
      console.log("[RESET-PASSWORD] Column check/add:", alterError)
      // Continue anyway - columns might already exist
    }

    // Find driver with matching email
    let result
    try {
      result = await sql`
        SELECT id, email, reset_token, reset_token_expiry 
        FROM drivers 
        WHERE email = ${email}
      `
    } catch (selectError: any) {
      console.error("[RESET-PASSWORD] Database select error:", selectError)
      
      // If the columns don't exist, try without them
      if (selectError.message?.includes('reset_token')) {
        return NextResponse.json(
          { error: "Password reset is not configured. Please contact support." },
          { status: 500 }
        )
      }
      throw selectError
    }

    if (result.rows.length === 0) {
      console.log("[RESET-PASSWORD] No driver found for email:", email)
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      )
    }

    const driver = result.rows[0]
    console.log("[RESET-PASSWORD] Found driver:", driver.id, "Token in DB:", driver.reset_token ? "exists" : "null")

    // Verify token matches
    if (!driver.reset_token || driver.reset_token !== token) {
      console.log("[RESET-PASSWORD] Token mismatch. Expected:", driver.reset_token?.substring(0, 10), "Got:", token?.substring(0, 10))
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      )
    }

    // Check token expiry
    if (driver.reset_token_expiry && new Date(driver.reset_token_expiry) < new Date()) {
      console.log("[RESET-PASSWORD] Token expired:", driver.reset_token_expiry)
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset token
    try {
      await sql`
        UPDATE drivers 
        SET password_hash = ${passwordHash},
            reset_token = NULL,
            reset_token_expiry = NULL
        WHERE email = ${email}
      `
    } catch (updateError) {
      console.error("[RESET-PASSWORD] Update error:", updateError)
      throw updateError
    }

    console.log("[RESET-PASSWORD] Password reset successfully for:", email)

    return NextResponse.json({ 
      success: true, 
      message: "Password has been reset successfully" 
    })
  } catch (error: any) {
    console.error("[RESET-PASSWORD] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to reset password. Please try again or contact support at (206) 765-6300." },
      { status: 500 }
    )
  }
}
