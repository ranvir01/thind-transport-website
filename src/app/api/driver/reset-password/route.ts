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

    // Find driver with matching token
    const result = await sql`
      SELECT id, email, reset_token, reset_token_expiry 
      FROM drivers 
      WHERE email = ${email}
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      )
    }

    const driver = result.rows[0]

    // Verify token matches
    if (driver.reset_token !== token) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      )
    }

    // Check token expiry
    if (driver.reset_token_expiry && new Date(driver.reset_token_expiry) < new Date()) {
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset token
    await sql`
      UPDATE drivers 
      SET password_hash = ${passwordHash},
          reset_token = NULL,
          reset_token_expiry = NULL
      WHERE email = ${email}
    `

    console.log("Password reset successfully for:", email)

    return NextResponse.json({ 
      success: true, 
      message: "Password has been reset successfully" 
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}

