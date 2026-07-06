/**
 * Database Setup Script
 * Run this once to initialize tables and migrate existing data
 */

import { hubDb, query } from "./hub/db"
import { readFileSync } from "fs"
import { join } from "path"

async function exec(text: string, params: unknown[] = []): Promise<void> {
  await hubDb().query(text, params)
}

export async function setupDatabase() {
  try {
    console.log("Setting up database tables...")

    await exec(`
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
    `)

    await exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(255) PRIMARY KEY,
        driver_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pdf_path TEXT,
        status VARCHAR(30) DEFAULT 'submitted',
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      )
    `)
    await exec(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'submitted'`)

    await exec(`
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
    `)

    await exec(`CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email)`)
    await exec(`CREATE INDEX IF NOT EXISTS idx_applications_driver_id ON applications(driver_id)`)
    await exec(`CREATE INDEX IF NOT EXISTS idx_public_applications_email ON public_applications(email)`)

    try {
      await exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token TEXT`)
      await exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`)
      console.log("✓ Password reset columns added")
    } catch (e) {
      console.log("- Password reset columns already exist or could not be added")
    }

    console.log("✓ Tables created successfully")

    try {
      const driversFile = join(process.cwd(), "data", "drivers.json")
      const driversData = JSON.parse(readFileSync(driversFile, "utf-8"))

      for (const driver of driversData) {
        const existing = await query<{ id: string }>(
          `SELECT id FROM drivers WHERE email = $1`,
          [driver.email]
        )

        if (existing.length === 0) {
          await exec(
            `INSERT INTO drivers (
              id, email, password_hash, first_name, last_name,
              phone, invitation_code, created_at, application_completed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              driver.id,
              driver.email,
              driver.passwordHash,
              driver.firstName,
              driver.lastName,
              driver.phone,
              driver.invitationCode,
              driver.createdAt,
              driver.applicationCompleted,
            ]
          )
          console.log(`✓ Migrated driver: ${driver.email}`)
        } else {
          console.log(`- Driver already exists: ${driver.email}`)
        }
      }
    } catch (error) {
      console.log("- No existing drivers.json file to migrate")
    }

    console.log("✓ Database setup complete!")
    return { success: true }
  } catch (error) {
    console.error("Database setup error:", error)
    throw error
  }
}
