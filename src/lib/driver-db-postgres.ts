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

interface Application {
  id: string
  driverId: string
  data: any
  submittedAt: Date
  pdfPath?: string
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
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_driver_id ON applications(driver_id)`

    console.log("Database tables initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}

// Verify invitation code
export async function verifyInvitationCode(code: string): Promise<boolean> {
  return code === "THIND-2026"
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
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO applications (id, driver_id, data)
      VALUES (${id}, ${driverId}, ${JSON.stringify(applicationData)}::jsonb)
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
    }
  } catch (error) {
    console.error("Save application error:", error)
    throw error
  }
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

