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

    // Send email notifications
    let emailSent = false
    let emailError = ''

    try {
      const transporter = nodemailer.createTransport(EMAIL_CONFIG)

      // Verify connection
      await transporter.verify()

      // Send email to HR with PDF attachment
      await transporter.sendMail({
        from: `"Thind Transport" <${FROM_EMAIL}>`,
        to: HR_EMAIL,
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

      // Send confirmation email to driver
      if (driverEmail) {
        await transporter.sendMail({
          from: `"Thind Transport" <${FROM_EMAIL}>`,
          to: driverEmail,
          subject: `Application Received - Thind Transport`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">Application Received!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for applying to Thind Transport</p>
              </div>
              <div style="padding: 30px 20px; background: white;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${driverName},</p>
                <p style="color: #666; line-height: 1.6;">
                  Thank you for submitting your driver application to <strong>Thind Transport LLC</strong>. 
                  We have received your completed DOT application and it is now being reviewed by our hiring team.
                </p>
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #166534; font-weight: 600;">✓ Application Status: Received</p>
                  <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Submitted: ${new Date().toLocaleString()}</p>
                </div>
                <h3 style="color: #1e3a5f; margin-top: 30px;">What Happens Next?</h3>
                <ol style="color: #666; line-height: 1.8; padding-left: 20px;">
                  <li><strong>Application Review:</strong> Our HR team will review your application within 2-3 business days.</li>
                  <li><strong>Initial Contact:</strong> If your qualifications match our requirements, we'll contact you via phone or email.</li>
                  <li><strong>Interview Process:</strong> Qualified candidates will be invited for an interview.</li>
                  <li><strong>Background Check:</strong> We'll conduct employment verification and MVR review.</li>
                  <li><strong>Final Decision:</strong> You'll receive notification of our hiring decision.</li>
                </ol>
                <p style="color: #666; line-height: 1.6; margin-top: 20px;">
                  If you have any questions about your application or the hiring process, please don't hesitate to contact us.
                </p>
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 25px;">
                  <h4 style="margin: 0 0 10px 0; color: #1e40af;">Contact Information</h4>
                  <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">📧 Email: hr@thindtransport.com</p>
                  <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">📞 Phone: (253) 638-5600</p>
                  <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">📍 Address: 20119 108th Ave SE, Kent, WA 98031</p>
                </div>
              </div>
              <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Thank you for considering Thind Transport as your next career opportunity!</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">Thind Transport LLC | Driver Application System</p>
              </div>
            </div>
          `,
        })
        console.log(`Confirmation email sent to ${driverEmail}`)
      }

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

