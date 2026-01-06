import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'

// Email configuration - uses environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
}

const HR_EMAIL = process.env.HR_EMAIL || 'hr@thindtransport.com'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@thindtransport.com'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const driverName = formData.get('driverName') as string || 'Unknown Driver'
    const driverEmail = formData.get('driverEmail') as string || ''
    const driverPhone = formData.get('driverPhone') as string || ''

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'applications')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedName = driverName.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${sanitizedName}_${timestamp}.pdf`
    const filepath = path.join(uploadsDir, filename)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    console.log(`Application saved: ${filepath}`)

    // Send email notification
    let emailSent = false
    let emailError = ''

    try {
      const transporter = nodemailer.createTransport(EMAIL_CONFIG)

      // Verify connection
      await transporter.verify()

      // Send email with PDF attachment
      await transporter.sendMail({
        from: `"Thind Transport" <${FROM_EMAIL}>`,
        to: HR_EMAIL,
        cc: driverEmail || undefined,
        subject: `New Driver Application: ${driverName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">New Driver Application</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <h2 style="color: #1e3a5f;">Applicant Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${driverName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${driverEmail || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${driverPhone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Submitted:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              <p style="margin-top: 20px; color: #666;">
                The completed DOT application is attached to this email.
              </p>
            </div>
            <div style="background: #1e3a5f; color: white; padding: 15px; text-align: center; font-size: 12px;">
              Thind Transport LLC | Driver Application System
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `DOT_Application_${sanitizedName}.pdf`,
            content: buffer,
            contentType: 'application/pdf',
          },
        ],
      })

      emailSent = true
      console.log(`Email sent to ${HR_EMAIL}`)
    } catch (err: any) {
      emailError = err.message
      console.error('Email send error:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Application uploaded successfully',
      filename,
      emailSent,
      emailError: emailSent ? null : emailError,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload application' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

