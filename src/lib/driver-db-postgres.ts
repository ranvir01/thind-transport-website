/**
 * Driver Account & Application Database Functions - Vercel Postgres
 * Production-ready with automatic persistence
 */

import { sql } from "@vercel/postgres"

interface Driver {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string
  invitationCode: string
  createdAt: Date
  applicationCompleted: boolean
}

export type ApplicationStatus = "submitted" | "under_review" | "approved" | "needs_info"

interface Application {
  id: string
  driverId: string
  data: any
  submittedAt: Date
  pdfPath?: string
  status: ApplicationStatus
}

export interface PublicApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  driverType?: string
  data: any
  emailDelivered: boolean
  createdAt: Date
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create drivers table
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        invitation_code VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        application_completed BOOLEAN DEFAULT FALSE
      )
    `

    // Create applications table
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(255) PRIMARY KEY,
        driver_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pdf_path TEXT,
        status VARCHAR(30) DEFAULT 'submitted',
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `
    await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'submitted'`

    // Public website applications (apply form / pre-qualify) — stored even if email fails
    await sql`
      CREATE TABLE IF NOT EXISTS public_applications (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        driver_type VARCHAR(100),
        data JSONB NOT NULL,
        email_delivered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_driver_id ON applications(driver_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_public_applications_email ON public_applications(email)`

    console.log("Database tables initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}

// Self-healing schema: newer tables/columns are created on demand so production
// keeps working without a manual setup step after deploys.
let schemaEnsured = false
async function ensureSchema() {
  if (schemaEnsured) return
  try {
    await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'submitted'`
    await sql`
      CREATE TABLE IF NOT EXISTS public_applications (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        driver_type VARCHAR(100),
        data JSONB NOT NULL,
        email_delivered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_public_applications_email ON public_applications(email)`
    schemaEnsured = true
  } catch (error) {
    console.error("Schema ensure error:", error)
  }
}

// Verify invitation code
export async function verifyInvitationCode(code: string): Promise<boolean> {
  return code === (process.env.DRIVER_INVITATION_CODE || "THIND-2026")
}

// Create driver account
export async function createDriver(driverData: {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string
  invitationCode: string
}): Promise<Driver> {
  try {
    // Check if email already exists
    const existing = await sql`
      SELECT id FROM drivers WHERE email = ${driverData.email}
    `
    
    if (existing.rows.length > 0) {
      throw new Error("Email already registered")
    }

    const id = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO drivers (
        id, email, password_hash, first_name, last_name, 
        phone, invitation_code, application_completed
      ) VALUES (
        ${id},
        ${driverData.email},
        ${driverData.passwordHash},
        ${driverData.firstName},
        ${driverData.lastName},
        ${driverData.phone},
        ${driverData.invitationCode},
        false
      )
    `

    return {
      id,
      email: driverData.email,
      passwordHash: driverData.passwordHash,
      firstName: driverData.firstName,
      lastName: driverData.lastName,
      phone: driverData.phone,
      invitationCode: driverData.invitationCode,
      createdAt: new Date(),
      applicationCompleted: false,
    }
  } catch (error) {
    console.error("Create driver error:", error)
    throw error
  }
}

// Find driver by email
export async function findDriverByEmail(email: string): Promise<Driver | null> {
  try {
    const result = await sql`
      SELECT 
        id, email, password_hash as "passwordHash", 
        first_name as "firstName", last_name as "lastName",
        phone, invitation_code as "invitationCode",
        created_at as "createdAt", application_completed as "applicationCompleted"
      FROM drivers 
      WHERE email = ${email}
    `

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as Driver
  } catch (error) {
    console.error("Find driver error:", error)
    return null
  }
}

// Find driver by ID
export async function findDriverById(id: string): Promise<Driver | null> {
  try {
    const result = await sql`
      SELECT 
        id, email, password_hash as "passwordHash",
        first_name as "firstName", last_name as "lastName",
        phone, invitation_code as "invitationCode",
        created_at as "createdAt", application_completed as "applicationCompleted"
      FROM drivers 
      WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as Driver
  } catch (error) {
    console.error("Find driver by ID error:", error)
    return null
  }
}

// Save application
export async function saveApplication(driverId: string, applicationData: any): Promise<Application> {
  try {
    await ensureSchema()
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO applications (id, driver_id, data, status)
      VALUES (${id}, ${driverId}, ${JSON.stringify(applicationData)}::jsonb, 'submitted')
    `

    // Mark driver's application as completed
    await sql`
      UPDATE drivers 
      SET application_completed = true 
      WHERE id = ${driverId}
    `

    return {
      id,
      driverId,
      data: applicationData,
      submittedAt: new Date(),
      status: "submitted",
    }
  } catch (error) {
    console.error("Save application error:", error)
    throw error
  }
}

// Latest application summary for a driver (dashboard / profile)
export async function getLatestApplicationForDriver(driverId: string): Promise<{
  id: string
  status: ApplicationStatus
  submittedAt: Date
  hasPdf: boolean
} | null> {
  try {
    await ensureSchema()
    const result = await sql`
      SELECT id, status, submitted_at as "submittedAt", pdf_path as "pdfPath"
      FROM applications
      WHERE driver_id = ${driverId}
      ORDER BY submitted_at DESC
      LIMIT 1
    `
    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      id: row.id,
      status: (row.status || "submitted") as ApplicationStatus,
      submittedAt: row.submittedAt,
      hasPdf: Boolean(row.pdfPath),
    }
  } catch (error) {
    console.error("Get latest application error:", error)
    return null
  }
}

// Store a public website application (apply form) — persistence-first, email-second
export async function savePublicApplication(record: {
  firstName: string
  lastName: string
  email: string
  phone: string
  driverType?: string
  data: any
  emailDelivered: boolean
}): Promise<PublicApplication> {
  await ensureSchema()
  const id = `pub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await sql`
    INSERT INTO public_applications (id, first_name, last_name, email, phone, driver_type, data, email_delivered)
    VALUES (
      ${id}, ${record.firstName}, ${record.lastName}, ${record.email.toLowerCase()},
      ${record.phone}, ${record.driverType || null}, ${JSON.stringify(record.data)}::jsonb, ${record.emailDelivered}
    )
  `
  return { id, ...record, createdAt: new Date() }
}

export async function markPublicApplicationEmailed(id: string) {
  try {
    await sql`UPDATE public_applications SET email_delivered = true WHERE id = ${id}`
  } catch (error) {
    console.error("Mark public application emailed error:", error)
  }
}

// Has this email submitted a public application? (used to waive the invitation code)
export async function hasPublicApplication(email: string): Promise<boolean> {
  try {
    await ensureSchema()
    const result = await sql`
      SELECT id FROM public_applications WHERE email = ${email.toLowerCase()} LIMIT 1
    `
    return result.rows.length > 0
  } catch (error) {
    console.error("Has public application error:", error)
    return false
  }
}

// ---- Password reset tokens ----

export async function setResetToken(email: string, token: string, expiry: Date): Promise<void> {
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token TEXT`
  await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`
  await sql`
    UPDATE drivers
    SET reset_token = ${token}, reset_token_expiry = ${expiry.toISOString()}
    WHERE email = ${email}
  `
}

export async function verifyResetToken(email: string, token: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const result = await sql`
      SELECT reset_token, reset_token_expiry FROM drivers WHERE email = ${email}
    `
    if (result.rows.length === 0) return { valid: false, reason: "not_found" }
    const row = result.rows[0]
    if (!row.reset_token || row.reset_token !== token) return { valid: false, reason: "mismatch" }
    if (row.reset_token_expiry && new Date(row.reset_token_expiry) < new Date()) {
      return { valid: false, reason: "expired" }
    }
    return { valid: true }
  } catch (error) {
    console.error("Verify reset token error:", error)
    return { valid: false, reason: "error" }
  }
}

export async function updateDriverPassword(email: string, passwordHash: string): Promise<void> {
  await sql`
    UPDATE drivers
    SET password_hash = ${passwordHash}, reset_token = NULL, reset_token_expiry = NULL
    WHERE email = ${email}
  `
}

// Update application PDF path
export async function updateApplicationPDFPath(applicationId: string, pdfPath: string) {
  try {
    await sql`
      UPDATE applications 
      SET pdf_path = ${pdfPath}
      WHERE id = ${applicationId}
    `
  } catch (error) {
    console.error("Update PDF path error:", error)
    throw error
  }
}

// Update driver application status
export async function updateDriverApplicationStatus(driverId: string, completed: boolean) {
  try {
    await sql`
      UPDATE drivers 
      SET application_completed = ${completed}
      WHERE id = ${driverId}
    `
  } catch (error) {
    console.error("Update driver application status error:", error)
    throw error
  }
}

