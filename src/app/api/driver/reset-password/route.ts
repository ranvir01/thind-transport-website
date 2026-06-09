/**
 * Reset Password API Route
 * Validates token and updates the password (Postgres or local JSON storage)
 */

import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { verifyResetToken, updateDriverPassword } from "@/lib/driver-db"

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

    const result = await verifyResetToken(email, token)
    if (!result.valid) {
      const message =
        result.reason === "expired"
          ? "Reset link has expired. Please request a new one."
          : "Invalid or expired reset link"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Hash new password, save, and clear the token
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await updateDriverPassword(email, passwordHash)

    console.log("[RESET-PASSWORD] Password reset successfully for:", email)

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("[RESET-PASSWORD] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to reset password. Please try again or contact support at (206) 765-6300." },
      { status: 500 }
    )
  }
}
