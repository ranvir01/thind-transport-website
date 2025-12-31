/**
 * Database Setup Script
 * Run this once to initialize tables and migrate existing data
 */

import { sql } from "@vercel/postgres"
import { readFileSync } from "fs"
import { join } from "path"

export async function setupDatabase() {
  try {
    console.log("Setting up database tables...")

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
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_driver_id ON applications(driver_id)`

    console.log("✓ Tables created successfully")

    // Migrate existing driver from JSON file
    try {
      const driversFile = join(process.cwd(), "data", "drivers.json")
      const driversData = JSON.parse(readFileSync(driversFile, "utf-8"))

      for (const driver of driversData) {
        // Check if driver already exists
        const existing = await sql`SELECT id FROM drivers WHERE email = ${driver.email}`
        
        if (existing.rows.length === 0) {
          await sql`
            INSERT INTO drivers (
              id, email, password_hash, first_name, last_name,
              phone, invitation_code, created_at, application_completed
            ) VALUES (
              ${driver.id},
              ${driver.email},
              ${driver.passwordHash},
              ${driver.firstName},
              ${driver.lastName},
              ${driver.phone},
              ${driver.invitationCode},
              ${driver.createdAt},
              ${driver.applicationCompleted}
            )
          `
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

