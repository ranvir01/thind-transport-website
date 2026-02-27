/**
 * Forgot Password API Route
 * Sends a password reset email with a secure token
 */

import { NextResponse } from "next/server"
import { findDriverByEmail } from "@/lib/driver-db"
import { sql } from "@vercel/postgres"
import crypto from "crypto"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if driver exists
    const driver = await findDriverByEmail(email)
    
    // Always return success to prevent email enumeration attacks
    if (!driver) {
      console.log("Password reset requested for non-existent email:", email)
      return NextResponse.json({ 
        success: true, 
        message: "If an account exists with that email, a reset link has been sent." 
      })
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    try {
      // Ensure columns exist
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token TEXT`
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`
      
      await sql`
        UPDATE drivers 
        SET reset_token = ${resetToken}, 
            reset_token_expiry = ${resetTokenExpiry.toISOString()}
        WHERE email = ${email}
      `
      console.log("[FORGOT-PASSWORD] Reset token stored for:", email)
    } catch (dbError) {
      console.error("[FORGOT-PASSWORD] Database error storing reset token:", dbError)
      // Continue with email anyway - user can try again
    }

    // Create reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://thindtransport.com'
    const resetUrl = `${baseUrl}/driver/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Thind Transport" <noreply@thindtransport.com>',
      to: email,
      subject: "Reset Your Thind Transport Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thind Transport</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password for your Thind Transport driver account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>Thind Transport LLC | (206) 765-6300</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    console.log("Password reset email sent to:", email)

    return NextResponse.json({ 
      success: true, 
      message: "If an account exists with that email, a reset link has been sent." 
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}

