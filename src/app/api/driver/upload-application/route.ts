import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'
import path from 'path'
import nodemailer from 'nodemailer'
import { auth } from '@/lib/auth'
import { saveApplication } from '@/lib/driver-db'
import { formatDOTApplicationEmailHtml } from '@/lib/email-service'
import type { DriverApplicationFormData } from '@/types/driver-application-form'

// nodemailer + pdf buffers require the Node.js runtime (not Edge).
export const runtime = 'nodejs'

const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
}

// Default to the real company inbox so applications are never lost if the
// dedicated HR alias is not configured via environment variables.
const HR_EMAIL = process.env.HR_EMAIL || process.env.SMTP_USER || 'thindcarrier@gmail.com'
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@thindtransport.com'

/**
 * Best-effort archival copy of the PDF. On serverless platforms (e.g. Vercel)
 * the working directory is read-only, so we fall back to the OS temp dir and
 * never let a failed write break the submission — the email is the source of
 * truth and the structured data is persisted in the database.
 */
async function archivePdf(buffer: Buffer, filename: string): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), 'uploads', 'applications'),
    path.join(os.tmpdir(), 'thind-applications'),
  ]
  for (const dir of candidates) {
    try {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      const filepath = path.join(dir, filename)
      await writeFile(filepath, buffer)
      console.log(`Application archived: ${filepath}`)
      return filepath
    } catch (err) {
      // Try the next candidate location.
      console.warn(`Could not archive PDF to ${dir}:`, (err as Error).message)
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const driverName = (formData.get('driverName') as string) || 'Unknown Driver'
    const driverEmail = (formData.get('driverEmail') as string) || ''
    const driverPhone = (formData.get('driverPhone') as string) || ''
    const applicationDataRaw = formData.get('applicationData') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }

    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB' }, { status: 400 })
    }

    // Parse the structured application (used for the detailed email + DB record).
    let applicationData: Partial<DriverApplicationFormData> | null = null
    if (applicationDataRaw) {
      try {
        applicationData = JSON.parse(applicationDataRaw)
      } catch {
        console.warn('Could not parse applicationData payload; continuing with PDF only.')
      }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedName = driverName.replace(/[^a-zA-Z0-9]/g, '_') || 'driver'
    const filename = `${sanitizedName}_${timestamp}.pdf`

    // 1) Archive a copy (best-effort, never fatal).
    const archivedPath = await archivePdf(buffer, filename)

    // 2) Persist the structured application to the internal database (best-effort).
    let savedToDb = false
    try {
      const session = await auth()
      const driverId = (session?.user as { id?: string } | undefined)?.id
      if (driverId && applicationData) {
        await saveApplication(driverId, {
          ...applicationData,
          submittedDriverName: driverName,
          submittedDriverEmail: driverEmail,
          submittedDriverPhone: driverPhone,
          archivedPath,
        })
        savedToDb = true
        console.log(`Application saved to database for driver ${driverId}`)
      }
    } catch (dbErr) {
      console.error('Database save error (non-fatal):', dbErr)
    }

    // 3) Email the application to the team with a detailed summary + PDF.
    let emailSent = false
    let emailError = ''

    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      emailError = 'SMTP credentials not configured (SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS).'
      console.warn(emailError)
    } else {
      try {
        const transporter = nodemailer.createTransport(EMAIL_CONFIG)

        const detailedHtml = applicationData
          ? formatDOTApplicationEmailHtml(applicationData, { driverName, driverEmail, driverPhone })
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #001F3F; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">New Driver Application</h1>
              </div>
              <div style="padding: 20px; background: #f5f5f5;">
                <p><strong>Name:</strong> ${driverName}</p>
                <p><strong>Email:</strong> ${driverEmail || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${driverPhone || 'Not provided'}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin-top: 20px; color: #666;">The completed DOT application is attached.</p>
              </div>
            </div>`

        await transporter.sendMail({
          from: `"Thind Transport Driver Portal" <${FROM_EMAIL}>`,
          to: HR_EMAIL,
          replyTo: driverEmail || undefined,
          subject: `New DOT Driver Application: ${driverName}`,
          html: detailedHtml,
          attachments: [
            {
              filename: `DOT_Application_${sanitizedName}.pdf`,
              content: buffer,
              contentType: 'application/pdf',
            },
          ],
        })

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
                    <p style="margin: 0; color: #166534; font-weight: 600;">Application Status: Received</p>
                    <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Submitted: ${new Date().toLocaleString()}</p>
                  </div>
                  <h3 style="color: #001F3F; margin-top: 30px;">What Happens Next?</h3>
                  <ol style="color: #666; line-height: 1.8; padding-left: 20px;">
                    <li><strong>Application Review:</strong> Our team reviews your application within 2-3 business days.</li>
                    <li><strong>Initial Contact:</strong> If your qualifications match, we'll contact you by phone or email.</li>
                    <li><strong>Background Check:</strong> We'll conduct employment verification and MVR review.</li>
                    <li><strong>Final Decision:</strong> You'll receive notification of our hiring decision.</li>
                  </ol>
                  <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 25px;">
                    <h4 style="margin: 0 0 10px 0; color: #1e40af;">Contact Information</h4>
                    <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">Email: thindcarrier@gmail.com</p>
                    <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">Phone: (206) 765-6300</p>
                  </div>
                </div>
                <div style="background: #001F3F; color: white; padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; opacity: 0.7;">Thind Transport LLC | Driver Application System</p>
                </div>
              </div>`,
          })
          console.log(`Confirmation email sent to ${driverEmail}`)
        }

        emailSent = true
        console.log(`Application email sent to ${HR_EMAIL}`)
      } catch (err) {
        emailError = (err as Error).message
        console.error('Email send error:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      filename,
      savedToDb,
      emailSent,
      emailError: emailSent ? null : emailError,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to upload application' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
